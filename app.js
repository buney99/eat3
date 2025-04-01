// app.js

// 從我們建立的 firebase-init.js 導入工具
import { db, collection, getDocs, addDoc, serverTimestamp } from './firebase-init.js';

// --- 全域變數宣告 ---
let menu = {}; // 將從 Firestore 填充
let venueName = "";
let contactPhone = "";
let orders = []; // 目前使用者的訂單列表
let selectedItem = null; // 彈出視窗中當前選擇的品項基礎資訊
let quantity = 1; // 彈出視窗中的數量
let temp = ""; // 彈出視窗中的冷熱選項
let sweetness = ""; // 彈出視窗中的甜度選項

// --- DOM 元素引用 ---
const venueNameInput = document.getElementById("venueName");
const contactPhoneInput = document.getElementById("contactPhone");
const menuDiv = document.getElementById("menu");
const modalDiv = document.getElementById("modal");
const modalTitle = document.getElementById("modal-title");
const modalOptions = document.getElementById("modal-options");
const quantityInput = document.getElementById("quantity");
const orderListUl = document.getElementById("orderList");
const orderResponseP = document.getElementById("orderResponse");
// 獲取提交按鈕（稍後在 submitOrders 中使用）
const submitButton = document.querySelector('button[onclick="submitOrders()"]'); // 直接獲取按鈕

// --- 事件監聽器 ---
venueNameInput.addEventListener("input", (e) => {
    venueName = e.target.value;
});

contactPhoneInput.addEventListener("input", (e) => {
    contactPhone = e.target.value;
});

quantityInput.addEventListener("input", (e) => {
    // 確保數量至少為 1
    quantity = Math.max(1, parseInt(e.target.value) || 1);
    // 更新輸入框的值以防用戶輸入無效值（例如負數或 0）
    e.target.value = quantity;
});

// --- 核心功能函數 ---

/**
 * 從 Firestore 獲取菜單數據並觸發渲染
 */
async function fetchMenuData() {
    menu = {}; // 重置菜單
    menuDiv.innerHTML = "<p style='text-align:center;'>正在載入菜單...</p>"; // 顯示載入中訊息
    try {
        // 從 'menuCategories' 集合獲取所有文件
        const querySnapshot = await getDocs(collection(db, "menuCategories"));

        // 處理查詢結果，填充 menu 物件
        querySnapshot.forEach((doc) => {
            const categoryData = doc.data();
            // 確保 categoryData.items 是一個陣列
            if (categoryData.categoryName && Array.isArray(categoryData.items)) {
                menu[categoryData.categoryName] = categoryData.items.map(item => ({
                    name: item.name || "未知品項", // 提供默認值
                    // 確保 requiresOptions 是布林值，如果 Firestore 中沒有則預設為 false
                    requiresOptions: typeof item.requiresOptions === 'boolean' ? item.requiresOptions : false
                }));
            } else {
                console.warn(`Skipping category document ${doc.id} due to invalid data format.`);
            }
        });

        console.log("Menu loaded from Firestore:", menu);
        if (Object.keys(menu).length > 0) {
            renderMenu(); // 成功獲取數據後才渲染菜單
        } else {
             menuDiv.innerHTML = "<p style='color:red; text-align:center;'>找不到菜單資料，請聯絡管理員。</p>";
        }

    } catch (error) {
        console.error("Error fetching menu from Firestore: ", error);
        // 向使用者顯示更明確的錯誤訊息
        menuDiv.innerHTML = `<p style='color:red; text-align:center;'>載入菜單時發生錯誤：${error.message} 請稍後再試。</p>`;
    }
}

/**
 * 根據 menu 物件渲染菜單到 HTML
 */
function renderMenu() {
    menuDiv.innerHTML = ""; // 清空現有菜單
    // 排序分類名稱以便一致顯示
    const sortedCategories = Object.keys(menu).sort();

    if (sortedCategories.length === 0) {
         menuDiv.innerHTML = "<p style='text-align:center;'>目前沒有可顯示的菜單項目。</p>";
         return;
    }

    for (const categoryName of sortedCategories) {
        const itemsFromCategory = menu[categoryName]; // 獲取該分類的品項陣列

        const categoryDiv = document.createElement("div");
        categoryDiv.classList.add("menu-category");

        const categoryTitle = document.createElement("h2");
        // 使用 innerHTML 以便 <br> 生效
        categoryTitle.innerHTML = categoryName.replace(" / ", "<br>");
        categoryTitle.style.whiteSpace = "normal";
        categoryDiv.appendChild(categoryTitle);

        const itemsDiv = document.createElement("div");
        itemsDiv.classList.add("menu-items");

        // 遍歷該分類下的品項
        itemsFromCategory.forEach((item) => { // item 現在包含 name 和 requiresOptions
            const itemButton = document.createElement("button");
            itemButton.innerHTML = item.name.replace(" / ", "<br>");
            itemButton.style.whiteSpace = "normal";
            // 將分類名稱和完整的 item 物件傳遞給 openModal
            itemButton.addEventListener("click", () => openModal(categoryName, item));
            itemsDiv.appendChild(itemButton);
        });
        categoryDiv.appendChild(itemsDiv);
        menuDiv.appendChild(categoryDiv);
    }
}

/**
 * 打開品項選項彈出視窗
 * @param {string} categoryName - 所選品項的分類名稱
 * @param {object} item - 所選品項的物件 (包含 name 和 requiresOptions)
 */
function openModal(categoryName, item) {
    // 記錄基礎資訊
    selectedItem = { category: categoryName, name: item.name };
    // 重置選項和數量
    quantity = 1;
    temp = "";
    sweetness = "";
    quantityInput.value = 1; // 重置數量輸入框
    modalTitle.innerHTML = item.name.replace(" / ", "<br>"); // 使用 innerHTML
    modalTitle.style.whiteSpace = "normal";
    modalOptions.innerHTML = ""; // 清空之前的選項

    // 根據從 Firestore 獲取的 requiresOptions 決定是否顯示冷熱甜度
    if (item.requiresOptions) {
        // --- 建立冷熱選項 ---
        const tempDiv = document.createElement("div");
        tempDiv.style.marginBottom = "15px";
        const tempLabel = document.createElement("label");
        tempLabel.textContent = "冷/熱： ";
        tempLabel.htmlFor = "tempSelect"; // 關聯 label 和 select
        const tempSelect = document.createElement("select");
        tempSelect.id = "tempSelect"; // 給 select 一個 id
        tempSelect.innerHTML = `
            <option value="">請選擇</option>
            <option value="冷">冷</option>
            <option value="熱">熱</option>
        `;
        tempSelect.addEventListener("change", (e) => { temp = e.target.value; });
        tempDiv.appendChild(tempLabel);
        tempDiv.appendChild(tempSelect);
        modalOptions.appendChild(tempDiv);

        // --- 建立甜度選項 ---
        const sweetnessDiv = document.createElement("div");
        sweetnessDiv.style.marginBottom = "15px";
        const sweetnessLabel = document.createElement("label");
        sweetnessLabel.textContent = "甜度： ";
        sweetnessLabel.htmlFor = "sweetnessSelect"; // 關聯 label 和 select
        const sweetnessSelect = document.createElement("select");
        sweetnessSelect.id = "sweetnessSelect"; // 給 select 一個 id
        sweetnessSelect.innerHTML = `
            <option value="">請選擇</option>
            <option value="無糖">無糖</option>
            <option value="半糖">半糖</option>
            <option value="全糖">全糖</option>
        `;
        sweetnessSelect.addEventListener("change", (e) => { sweetness = e.target.value; });
        sweetnessDiv.appendChild(sweetnessLabel);
        sweetnessDiv.appendChild(sweetnessSelect);
        modalOptions.appendChild(sweetnessDiv);
    }

    // 顯示彈出視窗
    modalDiv.style.display = "flex";
}

/**
 * 關閉彈出視窗
 */
function closeModal() {
    modalDiv.style.display = "none";
    selectedItem = null; // 清除當前選中的品項
}

/**
 * 將帶有選項的品項加入到訂單列表 (orders 陣列)
 */
function addToOrders() {
    // 從 menu 物件中找到原始的品項資料，以檢查 requiresOptions
    const originalItemData = menu[selectedItem.category]?.find(i => i.name === selectedItem.name);

    // 如果找不到品項資料（理論上不應發生），給出錯誤提示
    if (!originalItemData) {
        alert("發生錯誤：找不到品項資料。");
        closeModal();
        return;
    }

    // 如果品項需要選項，但用戶未選擇，則提示
    if (originalItemData.requiresOptions && (!temp || !sweetness)) {
        alert("請選擇冷熱與甜度");
        return; // 不關閉彈窗，讓用戶繼續選擇
    }

    // 建構要加入訂單的品項物件
    const orderItem = {
        name: selectedItem.name,
        quantity: quantity,
        // 只有在 requiresOptions 為 true 時才包含 temp 和 sweetness
        ...(originalItemData.requiresOptions && { temp: temp }),
        ...(originalItemData.requiresOptions && { sweetness: sweetness })
    };

    // 將品項加入 orders 陣列
    orders.push(orderItem);
    // 重新渲染訂單列表
    renderOrders();
    // 關閉彈出視窗
    closeModal();
}

/**
 * 從訂單列表中移除指定索引的品項
 * @param {number} index - 要移除品項在 orders 陣列中的索引
 */
function removeOrder(index) {
    // 使用 filter 創建一個不包含指定索引的新陣列
    orders = orders.filter((_, i) => i !== index);
    // 重新渲染訂單列表
    renderOrders();
}

/**
 * 根據 orders 陣列渲染訂單列表到 HTML
 */
function renderOrders() {
    orderListUl.innerHTML = ""; // 清空現有列表
    if (orders.length === 0) {
        const listItem = document.createElement("li");
        listItem.textContent = "目前沒有訂單";
        orderListUl.appendChild(listItem);
        return;
    }

    orders.forEach((order, index) => {
        const listItem = document.createElement("li");
        let itemDetails = `${order.name}`;
        // 如果訂單項目包含 temp 和 sweetness 屬性，則顯示它們
        if (order.temp && order.sweetness) {
            itemDetails += ` (${order.temp}, ${order.sweetness})`;
        }
        itemDetails += ` x ${order.quantity}`;
        listItem.textContent = itemDetails; // 設定文字內容

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "刪除";
        deleteButton.type = "button"; // 明確設置 type
        // 使用匿名函數傳遞 index 給 removeOrder
        deleteButton.addEventListener("click", () => removeOrder(index));
        listItem.appendChild(deleteButton); // 將刪除按鈕加入列表項

        orderListUl.appendChild(listItem); // 將列表項加入列表
    });
}

/**
 * 將訂單提交到 Firestore
 */
async function submitOrders() {
    // 1. 驗證輸入
    if (!venueName.trim() || !contactPhone.trim()) {
        alert("請先填寫場地名稱及連絡電話");
        return;
    }
    if (orders.length === 0) {
        alert("您的訂單是空的！");
        return;
    }

    // 2. 禁用按鈕，顯示處理中狀態
    if (submitButton) {
       submitButton.disabled = true;
       submitButton.textContent = "訂單傳送中...";
    }
    orderResponseP.textContent = ""; // 清除之前的響應訊息

    try {
        // 3. 準備要儲存到 Firestore 的資料結構
        const orderData = {
            venueName: venueName.trim(), // 去除前後空白
            contactPhone: contactPhone.trim(), // 去除前後空白
            items: orders, // 直接使用 orders 陣列
            createdAt: serverTimestamp(), // 使用 Firestore 的伺服器時間戳
            status: "new" // 設定初始訂單狀態為 "new"
        };

        // 4. 使用 addDoc 將資料寫入 Firestore 的 'orders' collection
        // addDoc 會自動生成一個唯一的文件 ID
        const docRef = await addDoc(collection(db, "orders"), orderData);

        // 5. 處理成功情況
        console.log("Order submitted successfully to Firestore with ID: ", docRef.id);
        // 在頁面上顯示成功訊息和訂單 ID
        orderResponseP.style.color = "green"; // 確保是綠色成功訊息
        orderResponseP.textContent = `訂單已成功送出，訂單編號: ${docRef.id}`;
        orders = []; // 清空前端的訂單陣列
        renderOrders(); // 更新顯示的訂單列表（變為空的）

        // 可選：清空場地和電話輸入欄
        // venueNameInput.value = "";
        // contactPhoneInput.value = "";
        // venueName = "";
        // contactPhone = "";

    } catch (error) {
        // 6. 處理錯誤情況
        console.error("Error submitting order to Firestore: ", error);
        alert("送出訂單時發生錯誤，請檢查網路連線或稍後再試。\n錯誤訊息：" + error.message);
        orderResponseP.style.color = "red"; // 顯示紅色錯誤訊息
        orderResponseP.textContent = "訂單送出失敗，請重試。";
    } finally {
        // 7. 無論成功或失敗，都重新啟用按鈕
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "送出訂單";
        }
    }
}

// --- 頁面載入完成後執行的初始化 ---
document.addEventListener('DOMContentLoaded', () => {
     // 確保按鈕上的 onclick 事件能正確找到函數
     // 將函數掛載到 window 對象上，以便 HTML 中的 onclick 可以找到它們
     // (這是模組化腳本與舊式 onclick 屬性共存的一種方式，雖然不是最優雅的)
     window.closeModal = closeModal;
     window.addToOrders = addToOrders;
     window.submitOrders = submitOrders;
     // removeOrder 是在 renderOrders 內部動態添加監聽器，所以不需要掛載到 window

     renderOrders(); // 先渲染一次空的訂單列表
     fetchMenuData(); // 開始從 Firestore 加載菜單數據
});