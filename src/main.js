/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  // purchase — это одна из записей в поле items из чека в data.purchase_records
  // _product — это продукт из коллекции data.products
  const { discount, sale_price, quantity } = purchase; 
  
  // @TODO: Расчет выручки от операции
  const decimalDiscount = discount / 100;
  const totalBeforeDiscount = sale_price * quantity;
  const revenue = totalBeforeDiscount * (1 - decimalDiscount);

  return revenue;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;
    
    // Расчет бонуса от позиции в рейтинге
    
    if (index === 0) return profit * 0.15; // Первое место - 15%
    if (index === 1 || index === 2) return profit * 0.10; // Второе и третье место - 10%
    if (index < total - 1) return profit * 0.05; // Все кроме последнего - 5%
    return 0; 
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // @TODO: Проверка входных данных
  if (
    !data ||
    !Array.isArray(data.sellers) ||
    data.sellers.length === 0 ||
    !Array.isArray(data.products) ||
    data.products.length === 0 ||
    !Array.isArray(data.purchase_records) ||
    data.purchase_records.length === 0
  ) {
    throw new Error("Некорректные входные данные");
  } 
  
  // Проверка наличия опций
  const { calculateRevenue, calculateBonus } = options;
  if (!calculateRevenue || !calculateBonus) {
    throw new Error("Не переданы необходимые функции для расчетов"); 
  }

  // Сюда передадим функции для расчётов
   const sellerStats = data.sellers.map(seller => ({
    seller_id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0, 
    sales_count: 0,
    products_sold: {}
  }));
   
   
   // Здесь посчитаем промежуточные данные и отсортируем продавцов
  const sellerIndex = Object.fromEntries(
    sellerStats.map(stat => [stat.seller_id, stat])
  );
  
  const productIndex = Object.fromEntries(
    data.products.map(product => [product.sku, product])
  );
  // Расчет выручки и прибыли для каждого продавца
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) return;

        seller.sales_count += 1;

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;

        // Расчет выручки
            const revenue = calculateRevenue(item, product);
            seller.revenue += revenue;

        // Расчет прибыли
            const cost = product.purchase_price * item.quantity;
            const itemProfit = revenue - cost;
            seller.profit += itemProfit;

   // Учет проданных товаров
   if (!seller.products_sold[item.sku]) {
    seller.products_sold[item.sku] = 0;
   }
   seller.products_sold[item.sku] += item.quantity;
  });
});
// Сортировка продавцов по прибыли
sellerStats.sort((a, b) => b.profit - a.profit);


//Назначение премий на основе ранжирования
  const totalSellers = sellerStats.length;
  const report = sellerStats.map((seller, index) => {
    const bonus_amount = calculateBonus(index, totalSellers, seller);


    const bonus_percent = seller.profit > 0 ? (bonus_amount / seller.profit) * 100 : 0;

// Определяем топовые товары
  const top_products = Object.entries(seller.products_sold)
     .sort(([,a], [,b]) => b - a)
     .slice(0, 3)
     .map(([sku, quantity]) => ({ sku, quantity }));

     return {
        seller_id: seller.seller_id,
        name: seller.name,
        revenue: Math.round(seller.revenue * 100) / 100,
        profit: Math.round(seller.profit * 100) / 100,
        sales_count: seller.sales_count,
        top_products: top_products,
        bonus: Math.round(bonus_amount * 100) / 100
        
     };
  });

  return report;
}