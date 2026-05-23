/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  // @TODO: Расчет выручки от операции
    const discount = 1 - (purchase.discount / 100);
    return purchase.sale_price * purchase.quantity * discount;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  // Расчет бонуса от позиции в рейтинге (сокращаем лесенки
  // - паттерн 'ранний возврат')
  if (index === 0) return seller.profit * 0.15; // для первого места
  if (index === 1 || index === 2) return seller.profit * 0.1; // для второго и третьего
  if (index === total - 1) return 0; // последнему не даем ничего
  return seller.profit * 0.05; // Для всех остальных
}

// функция для округления
function roundUp(toRoundUp) {
  return Number(toRoundUp.toFixed(2));
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  if (!data
    || !Array.isArray(data.sellers) || data.sellers.length === 0
    || !Array.isArray(data.customers) || data.customers.length === 0
    || !Array.isArray(data.products) || data.products.length === 0
    || !Array.isArray(data.purchase_records) || data.purchase_records.length === 0
  ) {
    throw new Error('Некорректные входные данные'); 
  }

  // Проверка наличия опций (две функции) - инверсия управления/объект настроек
  const { calculateRevenue, calculateBonus } = options;
  if (
    typeof options !== "object" ||
    typeof calculateRevenue !== "function" ||
    typeof calculateBonus !== "function"
  ) {
    throw new Error("Функции расчета не определены");
  }

  // сбор статистики
  const sellerStats = data.sellers.map((seller) => ({
    // Заполним начальными данными, содадим проектные поля по ТЗ.
    id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {},
  }));

  // Индексация продавцов и товаров для быстрого доступа
  const sellerIndex = sellerStats.reduce((sellerIndex, seller) => {
    sellerIndex[seller.id] = seller;
    return sellerIndex;
  }, {});
  const productIndex = data.products.reduce((productIndex, product) => {
    productIndex[product.sku] = product;
    return productIndex;
  }, {});

  // Расчет выручки и прибыли для каждого продавца
  // + считаем кол-во проданного товара
  data.purchase_records.forEach((record) => {
    const seller = sellerIndex[record.seller_id];
    // считаем/увеличиваем общую сумму выручки всех продаж
    if (seller) {
      seller.sales_count++;
      seller.revenue += record.total_amount;
      // пробегаемся по позициям чеков. считаем выручку и профит
      record.items.forEach((item) => {
        const product = productIndex[item.sku];
        const itemProductCost = product.purchase_price * item.quantity;
        const itemProductRevenue = calculateRevenue(item, product);
        // seller.revenue += itemProductRevenue;
        seller.profit += itemProductRevenue - itemProductCost;
        // добавляем проданный товар (если нет) + считаем количество его продажи
        if (!seller.products_sold[item.sku]) {
          seller.products_sold[item.sku] = 0;
        }
        seller.products_sold[item.sku] += item.quantity;
      });
    }
  });
  // Сортировка продавцов по прибыли
  sellerStats.sort((smaller, bigger) => bigger.profit - smaller.profit);

  // Возвращаем результат маппинга из функции analyzeSalesData
  return sellerStats.map((seller, index) => {
    // Сортируем и формируем топ-10 товаров
    const formattedProductsSold = Object.entries(seller.products_sold).map(
      ([sku, quantity]) => {
        return { sku, quantity };
      },
    );
    const formattedProductsSoldTop10 = formattedProductsSold
      .sort((smaller, bigger) => bigger.quantity - smaller.quantity)
      .slice(0, 10);
    const sellerBonus = calculateBonus(index, sellerStats.length, seller);
    // Подготовка итоговой коллекции с нужными полями
    //  Формируем итоговый объект отчета по ТЗ
    return {
      seller_id: seller.id,
      name: seller.name,
      revenue: roundUp(seller.revenue),
      profit: roundUp(seller.profit),
      sales_count: seller.sales_count,
      top_products: formattedProductsSoldTop10,
      bonus: roundUp(sellerBonus),
    };
  });
}
