const PRODUCTS = [
  {
    id: "p01",
    slug: "cream-crew-knit",
    name: "\u5976\u6CB9\u5713\u9818\u91DD\u7E54",
    category: "\u4E0A\u8EAB",
    price: 890,
    image: "assets/product-01.jpg",
    images: ["assets/product-01.jpg"],
    description: "\u67D4\u8EDF\u7D30\u7DFB\u7684\u65E5\u5E38\u91DD\u7E54\uFF0C\u843D\u80A9\u8F2A\u5ED3\u4FDD\u7559\u81EA\u5728\u7A7A\u9593\u3002\u642D\u914D\u9577\u88D9\u6216\u5BEC\u8932\uFF0C\u8F15\u9B06\u5B8C\u6210\u6EAB\u67D4\u7A7F\u642D\u3002",
    material: "\u793A\u610F\u6750\u8CEA\uFF1A\u68C9 55%\u3001\u805A\u916F\u7E96\u7DAD 45%",
    fit: "\u5FAE\u5BEC\u9B06\u7248\u578B\uFF1B\u793A\u610F\u5C3A\u5BF8 S / M\u3002\u5BE6\u969B\u5546\u54C1\u5C3A\u5BF8\u5F85\u5E97\u5BB6\u63D0\u4F9B\u3002",
    variants: [
      { id: "p01-ivory-s", color: "\u5976\u6CB9\u767D", colorHex: "#eee8dc", size: "S", stock: 6, preorder: false, leadDays: 2 },
      { id: "p01-ivory-m", color: "\u5976\u6CB9\u767D", colorHex: "#eee8dc", size: "M", stock: 4, preorder: false, leadDays: 2 },
      { id: "p01-oat-s", color: "\u71D5\u9EA5", colorHex: "#bcad99", size: "S", stock: 8, preorder: true, leadDays: 14 },
      { id: "p01-oat-m", color: "\u71D5\u9EA5", colorHex: "#bcad99", size: "M", stock: 8, preorder: true, leadDays: 14 }
    ]
  },
  {
    id: "p02",
    slug: "light-straight-pants",
    name: "\u6DFA\u674F\u76F4\u7B52\u9577\u8932",
    category: "\u4E0B\u8EAB",
    price: 1180,
    image: "assets/product-02.jpg",
    images: ["assets/product-02.jpg"],
    description: "\u81EA\u7136\u5782\u589C\u7684\u76F4\u7B52\u8932\u7BA1\uFF0C\u5E36\u51FA\u4E7E\u6DE8\u4FD0\u843D\u7684\u65E5\u5E38\u8F2A\u5ED3\u3002\u67D4\u548C\u6DFA\u674F\u8272\uFF0C\u9069\u5408\u642D\u914D\u91DD\u7E54\u8207\u896F\u886B\u3002",
    material: "\u793A\u610F\u6750\u8CEA\uFF1A\u68C9 70%\u3001\u805A\u916F\u7E96\u7DAD 30%",
    fit: "\u793A\u610F\u5C3A\u5BF8 M / L\uFF1B\u6B63\u5E38\u7248\u578B\u3002\u5BE6\u969B\u5C3A\u5BF8\u5F85\u5E97\u5BB6\u63D0\u4F9B\u3002",
    variants: [
      { id: "p02-tea-m", color: "\u6DFA\u674F", colorHex: "#d9cdbb", size: "M", stock: 4, preorder: false, leadDays: 2 },
      { id: "p02-tea-l", color: "\u6DFA\u674F", colorHex: "#d9cdbb", size: "L", stock: 3, preorder: false, leadDays: 2 },
      { id: "p02-ink-m", color: "\u58A8\u9ED1", colorHex: "#383734", size: "M", stock: 6, preorder: true, leadDays: 12 },
      { id: "p02-ink-l", color: "\u58A8\u9ED1", colorHex: "#383734", size: "L", stock: 6, preorder: true, leadDays: 12 }
    ]
  },
  {
    id: "p03",
    slug: "ivory-pullover-shirt",
    name: "\u7C73\u767D\u534A\u958B\u895F\u896F\u886B",
    category: "\u4E0A\u8EAB",
    price: 1080,
    image: "assets/product-03.jpg",
    images: ["assets/product-03.jpg"],
    description: "\u534A\u958B\u895F\u8207\u81EA\u7136\u5782\u843D\u7684\u8863\u8EAB\uFF0C\u4FDD\u7559\u8F15\u9B06\u81EA\u5728\u7684\u7A7F\u8457\u611F\u3002\u7C73\u767D\u8272\u8ABF\u9069\u5408\u65E5\u5E38\u53CD\u8986\u642D\u914D\u3002",
    material: "\u793A\u610F\u6750\u8CEA\uFF1A\u68C9 70%\u3001\u4E9E\u9EBB 30%",
    fit: "\u793A\u610F\u5C3A\u5BF8 S / M\uFF1B\u5BEC\u9B06\u7248\u578B\u3002\u5BE6\u969B\u5C3A\u5BF8\u5F85\u5E97\u5BB6\u63D0\u4F9B\u3002",
    variants: [
      { id: "p03-sand-s", color: "\u7C73\u767D", colorHex: "#e9e3d7", size: "S", stock: 5, preorder: false, leadDays: 2 },
      { id: "p03-sand-m", color: "\u7C73\u767D", colorHex: "#e9e3d7", size: "M", stock: 5, preorder: false, leadDays: 2 },
      { id: "p03-charcoal-s", color: "\u70AD\u7070", colorHex: "#65625b", size: "S", stock: 4, preorder: false, leadDays: 2 },
      { id: "p03-charcoal-m", color: "\u70AD\u7070", colorHex: "#65625b", size: "M", stock: 4, preorder: false, leadDays: 2 }
    ]
  },
  {
    id: "p04",
    slug: "oat-long-coat",
    name: "\u71D5\u9EA5\u9577\u7248\u5916\u5957",
    category: "\u5916\u5957",
    price: 990,
    image: "assets/product-04.jpg",
    images: ["assets/product-04.jpg"],
    description: "\u6EAB\u67D4\u71D5\u9EA5\u8272\u8207\u9577\u7248\u7DDA\u689D\uFF0C\u70BA\u65E5\u5E38\u7A7F\u642D\u589E\u6DFB\u81EA\u5728\u5C64\u6B21\u3002\u9069\u5408\u5FAE\u6DBC\u5929\u6C23\u88E1\u7684\u8F15\u76C8\u5305\u8986\u3002",
    material: "\u793A\u610F\u6750\u8CEA\uFF1A\u805A\u916F\u7E96\u7DAD 70%\u3001\u7F8A\u6BDB 30%",
    fit: "\u9577\u7248\u5BEC\u9B06\u8F2A\u5ED3\uFF0C\u793A\u610F\u5C3A\u5BF8 F\u3002\u5BE6\u969B\u5C3A\u5BF8\u5F85\u5E97\u5BB6\u63D0\u4F9B\u3002",
    variants: [
      { id: "p04-white-f", color: "\u71D5\u9EA5", colorHex: "#bcad99", size: "F", stock: 6, preorder: true, leadDays: 10 },
      { id: "p04-stone-f", color: "\u6DFA\u77F3\u7070", colorHex: "#c9c7be", size: "F", stock: 6, preorder: true, leadDays: 10 }
    ]
  },
  {
    id: "p05",
    slug: "apricot-tie-dress",
    name: "\u674F\u8272\u7D81\u5E36\u6D0B\u88DD",
    category: "\u6D0B\u88DD",
    price: 1480,
    image: "assets/product-05.jpg",
    images: ["assets/product-05.jpg"],
    description: "\u81EA\u7136\u5782\u589C\u7684\u88D9\u8EAB\u642D\u914D\u8170\u9593\u7D81\u5E36\uFF0C\u55AE\u4EF6\u5C31\u80FD\u5B8C\u6210\u67D4\u548C\u7A7F\u642D\u3002\u9069\u5408\u6162\u4E0B\u4F86\u7684\u5348\u5F8C\u8207\u57CE\u5E02\u6563\u6B65\u3002",
    material: "\u793A\u610F\u6750\u8CEA\uFF1A\u68C9 60%\u3001\u4E9E\u9EBB 40%",
    fit: "\u793A\u610F\u5C3A\u5BF8 S / M\uFF1B\u9644\u8170\u9593\u7D81\u5E36\u3002\u5BE6\u969B\u5C3A\u5BF8\u5F85\u5E97\u5BB6\u63D0\u4F9B\u3002",
    variants: [
      { id: "p05-cream-s", color: "\u674F\u4EC1", colorHex: "#d5c2aa", size: "S", stock: 3, preorder: false, leadDays: 2 },
      { id: "p05-cream-m", color: "\u674F\u4EC1", colorHex: "#d5c2aa", size: "M", stock: 2, preorder: false, leadDays: 2 },
      { id: "p05-black-s", color: "\u58A8\u9ED1", colorHex: "#383734", size: "S", stock: 5, preorder: true, leadDays: 18 },
      { id: "p05-black-m", color: "\u58A8\u9ED1", colorHex: "#383734", size: "M", stock: 5, preorder: true, leadDays: 18 }
    ]
  },
  {
    id: "p06",
    slug: "blue-striped-dress",
    name: "\u7070\u85CD\u7D30\u689D\u7D0B\u6D0B\u88DD",
    category: "\u6D0B\u88DD",
    price: 1280,
    image: "assets/product-06.jpg",
    images: ["assets/product-06.jpg"],
    description: "\u7D30\u7DFB\u689D\u7D0B\u8207\u6E05\u723D\u7070\u85CD\u8272\uFF0C\u5448\u73FE\u81EA\u5728\u7684\u65E5\u5E38\u6B65\u8ABF\u3002\u7C21\u55AE\u642D\u914D\u914D\u4EF6\uFF0C\u5C31\u80FD\u5B8C\u6210\u8F15\u76C8\u7A7F\u642D\u3002",
    material: "\u793A\u610F\u6750\u8CEA\uFF1A\u68C9 100%",
    fit: "\u793A\u610F\u5C3A\u5BF8 F\uFF1B\u5BEC\u9B06\u7248\u578B\u3002\u5BE6\u969B\u5C3A\u5BF8\u5F85\u5E97\u5BB6\u63D0\u4F9B\u3002",
    variants: [
      { id: "p06-blue-f", color: "\u7070\u85CD\u689D\u7D0B", colorHex: "#9daeb6", size: "F", stock: 5, preorder: false, leadDays: 2 },
      { id: "p06-gray-f", color: "\u6DFA\u7070\u689D\u7D0B", colorHex: "#c9c7be", size: "F", stock: 5, preorder: true, leadDays: 14 }
    ]
  },
  {
    id: "p07",
    slug: "beige-textured-scarf",
    name: "\u7C73\u8272\u7E54\u7D0B\u570D\u5DFE",
    category: "\u914D\u4EF6",
    price: 690,
    image: "assets/product-07.jpg",
    images: ["assets/product-07.jpg"],
    description: "\u67D4\u548C\u7C73\u8272\u8207\u7D30\u7DFB\u7E54\u7D0B\uFF0C\u70BA\u65E5\u5E38\u642D\u914D\u52A0\u4E0A\u4E00\u9EDE\u6EAB\u6696\u3002\u8F15\u9B06\u62AB\u639B\u6216\u74B0\u7E5E\uFF0C\u5448\u73FE\u81EA\u7136\u5C64\u6B21\u3002",
    material: "\u793A\u610F\u6750\u8CEA\uFF1A\u58D3\u514B\u529B\u7E96\u7DAD 70%\u3001\u7F8A\u6BDB 30%",
    fit: "\u793A\u610F\u5C3A\u5BF8 F\u3002\u5BE6\u969B\u9577\u5EA6\u8207\u5BEC\u5EA6\u5F85\u5E97\u5BB6\u63D0\u4F9B\u3002",
    variants: [
      { id: "p07-beige-f", color: "\u7C73\u8272", colorHex: "#d7cbb6", size: "F", stock: 4, preorder: false, leadDays: 2 },
      { id: "p07-gray-f", color: "\u6DFA\u7070", colorHex: "#c9c7be", size: "F", stock: 4, preorder: false, leadDays: 2 },
      { id: "p07-black-f", color: "\u58A8\u9ED1", colorHex: "#383734", size: "F", stock: 0, preorder: false, leadDays: 2 }
    ]
  },
  {
    id: "p08",
    slug: "gold-hoop-earrings",
    name: "\u91D1\u8272\u5708\u5F62\u8033\u98FE",
    category: "\u914D\u4EF6",
    price: 680,
    image: "assets/product-08.jpg",
    images: ["assets/product-08.jpg"],
    description: "\u7C21\u6F54\u5708\u5F62\u642D\u914D\u67D4\u548C\u91D1\u8272\u5149\u6FA4\uFF0C\u70BA\u6BCF\u5929\u7684\u7A7F\u642D\u7559\u4E0B\u7D30\u7DFB\u4EAE\u9EDE\u3002\u8F15\u5DE7\u7DDA\u689D\u9069\u5408\u65E5\u5E38\u914D\u6234\u3002",
    material: "\u793A\u610F\u6750\u8CEA\uFF1A\u5408\u91D1\u96FB\u934D\uFF1B\u5BE6\u969B\u6750\u8CEA\u8207\u904E\u654F\u8CC7\u8A0A\u5F85\u5E97\u5BB6\u63D0\u4F9B\u3002",
    fit: "\u793A\u610F\u5C3A\u5BF8 F\u3002\u5708\u5F91\u3001\u91CD\u91CF\u8207\u8033\u91DD\u898F\u683C\u5F85\u5E97\u5BB6\u63D0\u4F9B\u3002",
    variants: [
      { id: "p08-gold-f", color: "\u91D1\u8272", colorHex: "#c4a268", size: "F", stock: 1, preorder: false, leadDays: 2 },
      { id: "p08-silver-f", color: "\u9280\u8272", colorHex: "#b9bab7", size: "F", stock: 5, preorder: true, leadDays: 16 }
    ]
  }
];
function findProductByVariant(variantId, products = PRODUCTS) {
  for (const product of products) {
    const variant = product.variants.find((item) => item.id === variantId);
    if (variant) return { product, variant };
  }
  return void 0;
}
function findProduct(idOrSlug, products = PRODUCTS) {
  return products.find((product) => product.id === idOrSlug || product.slug === idOrSlug);
}
function cloneProducts(products = PRODUCTS) {
  return products.map((product) => ({ ...product, images: [...product.images], variants: product.variants.map((variant) => ({ ...variant })) }));
}
export {
  PRODUCTS,
  cloneProducts,
  findProduct,
  findProductByVariant
};
//# sourceMappingURL=catalog.js.map
