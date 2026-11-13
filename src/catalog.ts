export interface Variant {
  id: string;
  color: string;
  colorHex: string;
  size: string;
  /** 原型中的可購買配額；現貨與預購都有限量，不代表真實後端庫存。 */
  stock: number;
  preorder: boolean;
  leadDays: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  image: string;
  images: string[];
  description: string;
  material: string;
  fit: string;
  variants: Variant[];
}

export const PRODUCTS: Product[] = [
  {
    id: 'p01', slug: 'cream-crew-knit', name: '奶油圓領針織', category: '上身', price: 890,
    image: 'assets/product-01.jpg', images: ['assets/product-01.jpg'],
    description: '柔軟細緻的日常針織，落肩輪廓保留自在空間。搭配長裙或寬褲，輕鬆完成溫柔穿搭。',
    material: '示意材質：棉 55%、聚酯纖維 45%', fit: '微寬鬆版型；示意尺寸 S / M。實際商品尺寸待店家提供。',
    variants: [
      {id:'p01-ivory-s', color:'奶油白', colorHex:'#eee8dc', size:'S', stock:6, preorder:false, leadDays:2},
      {id:'p01-ivory-m', color:'奶油白', colorHex:'#eee8dc', size:'M', stock:4, preorder:false, leadDays:2},
      {id:'p01-oat-s', color:'燕麥', colorHex:'#bcad99', size:'S', stock:8, preorder:true, leadDays:14},
      {id:'p01-oat-m', color:'燕麥', colorHex:'#bcad99', size:'M', stock:8, preorder:true, leadDays:14},
    ],
  },
  {
    id:'p02', slug:'light-straight-pants', name:'淺杏直筒長褲', category:'下身', price:1180,
    image:'assets/product-02.jpg', images:['assets/product-02.jpg'],
    description:'自然垂墜的直筒褲管，帶出乾淨俐落的日常輪廓。柔和淺杏色，適合搭配針織與襯衫。',
    material:'示意材質：棉 70%、聚酯纖維 30%', fit:'示意尺寸 M / L；正常版型。實際尺寸待店家提供。',
    variants:[
      {id:'p02-tea-m', color:'淺杏', colorHex:'#d9cdbb', size:'M', stock:4, preorder:false, leadDays:2},
      {id:'p02-tea-l', color:'淺杏', colorHex:'#d9cdbb', size:'L', stock:3, preorder:false, leadDays:2},
      {id:'p02-ink-m', color:'墨黑', colorHex:'#383734', size:'M', stock:6, preorder:true, leadDays:12},
      {id:'p02-ink-l', color:'墨黑', colorHex:'#383734', size:'L', stock:6, preorder:true, leadDays:12},
    ],
  },
  {
    id:'p03', slug:'ivory-pullover-shirt', name:'米白半開襟襯衫', category:'上身', price:1080,
    image:'assets/product-03.jpg', images:['assets/product-03.jpg'],
    description:'半開襟與自然垂落的衣身，保留輕鬆自在的穿著感。米白色調適合日常反覆搭配。',
    material:'示意材質：棉 70%、亞麻 30%', fit:'示意尺寸 S / M；寬鬆版型。實際尺寸待店家提供。',
    variants:[
      {id:'p03-sand-s', color:'米白', colorHex:'#e9e3d7', size:'S', stock:5, preorder:false, leadDays:2},
      {id:'p03-sand-m', color:'米白', colorHex:'#e9e3d7', size:'M', stock:5, preorder:false, leadDays:2},
      {id:'p03-charcoal-s', color:'炭灰', colorHex:'#65625b', size:'S', stock:4, preorder:false, leadDays:2},
      {id:'p03-charcoal-m', color:'炭灰', colorHex:'#65625b', size:'M', stock:4, preorder:false, leadDays:2},
    ],
  },
  {
    id:'p04', slug:'oat-long-coat', name:'燕麥長版外套', category:'外套', price:990,
    image:'assets/product-04.jpg', images:['assets/product-04.jpg'],
    description:'溫柔燕麥色與長版線條，為日常穿搭增添自在層次。適合微涼天氣裡的輕盈包覆。',
    material:'示意材質：聚酯纖維 70%、羊毛 30%', fit:'長版寬鬆輪廓，示意尺寸 F。實際尺寸待店家提供。',
    variants:[
      {id:'p04-white-f', color:'燕麥', colorHex:'#bcad99', size:'F', stock:6, preorder:true, leadDays:10},
      {id:'p04-stone-f', color:'淺石灰', colorHex:'#c9c7be', size:'F', stock:6, preorder:true, leadDays:10},
    ],
  },
  {
    id:'p05', slug:'apricot-tie-dress', name:'杏色綁帶洋裝', category:'洋裝', price:1480,
    image:'assets/product-05.jpg', images:['assets/product-05.jpg'],
    description:'自然垂墜的裙身搭配腰間綁帶，單件就能完成柔和穿搭。適合慢下來的午後與城市散步。',
    material:'示意材質：棉 60%、亞麻 40%', fit:'示意尺寸 S / M；附腰間綁帶。實際尺寸待店家提供。',
    variants:[
      {id:'p05-cream-s', color:'杏仁', colorHex:'#d5c2aa', size:'S', stock:3, preorder:false, leadDays:2},
      {id:'p05-cream-m', color:'杏仁', colorHex:'#d5c2aa', size:'M', stock:2, preorder:false, leadDays:2},
      {id:'p05-black-s', color:'墨黑', colorHex:'#383734', size:'S', stock:5, preorder:true, leadDays:18},
      {id:'p05-black-m', color:'墨黑', colorHex:'#383734', size:'M', stock:5, preorder:true, leadDays:18},
    ],
  },
  {
    id:'p06', slug:'blue-striped-dress', name:'灰藍細條紋洋裝', category:'洋裝', price:1280,
    image:'assets/product-06.jpg', images:['assets/product-06.jpg'],
    description:'細緻條紋與清爽灰藍色，呈現自在的日常步調。簡單搭配配件，就能完成輕盈穿搭。',
    material:'示意材質：棉 100%', fit:'示意尺寸 F；寬鬆版型。實際尺寸待店家提供。',
    variants:[
      {id:'p06-blue-f', color:'灰藍條紋', colorHex:'#9daeb6', size:'F', stock:5, preorder:false, leadDays:2},
      {id:'p06-gray-f', color:'淺灰條紋', colorHex:'#c9c7be', size:'F', stock:5, preorder:true, leadDays:14},
    ],
  },
  {
    id:'p07', slug:'beige-textured-scarf', name:'米色織紋圍巾', category:'配件', price:690,
    image:'assets/product-07.jpg', images:['assets/product-07.jpg'],
    description:'柔和米色與細緻織紋，為日常搭配加上一點溫暖。輕鬆披掛或環繞，呈現自然層次。',
    material:'示意材質：壓克力纖維 70%、羊毛 30%', fit:'示意尺寸 F。實際長度與寬度待店家提供。',
    variants:[
      {id:'p07-beige-f', color:'米色', colorHex:'#d7cbb6', size:'F', stock:4, preorder:false, leadDays:2},
      {id:'p07-gray-f', color:'淺灰', colorHex:'#c9c7be', size:'F', stock:4, preorder:false, leadDays:2},
      {id:'p07-black-f', color:'墨黑', colorHex:'#383734', size:'F', stock:0, preorder:false, leadDays:2},
    ],
  },
  {
    id:'p08', slug:'gold-hoop-earrings', name:'金色圈形耳飾', category:'配件', price:680,
    image:'assets/product-08.jpg', images:['assets/product-08.jpg'],
    description:'簡潔圈形搭配柔和金色光澤，為每天的穿搭留下細緻亮點。輕巧線條適合日常配戴。',
    material:'示意材質：合金電鍍；實際材質與過敏資訊待店家提供。', fit:'示意尺寸 F。圈徑、重量與耳針規格待店家提供。',
    variants:[
      {id:'p08-gold-f', color:'金色', colorHex:'#c4a268', size:'F', stock:1, preorder:false, leadDays:2},
      {id:'p08-silver-f', color:'銀色', colorHex:'#b9bab7', size:'F', stock:5, preorder:true, leadDays:16},
    ],
  },
];

/** 查詢指定 SKU；所有庫存與價格仍是原型示意資料。 */
export function findProductByVariant(variantId: string, products: readonly Product[] = PRODUCTS): { product: Product; variant: Variant } | undefined {
  for (const product of products) {
    const variant = product.variants.find((item) => item.id === variantId);
    if (variant) return { product, variant };
  }
  return undefined;
}

export function findProduct(idOrSlug: string, products: readonly Product[] = PRODUCTS): Product | undefined {
  return products.find((product) => product.id === idOrSlug || product.slug === idOrSlug);
}

export function cloneProducts(products: readonly Product[] = PRODUCTS): Product[] {
  return products.map((product) => ({ ...product, images: [...product.images], variants: product.variants.map((variant) => ({ ...variant })) }));
}
