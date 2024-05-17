import axios from "axios";

const ProductCard = ({ product, key }) => {
// POST request 
const handleSubscription = async (e: Event) => {
  e.preventDefault();
  const { data } = await axios.post('/api/payment',
  {
    product: product
  },
  {
    headers: {
      "Content-Type": "application/json",
    },
  }
  );
  window.location.assign(data.url)
}
  return (
    <div><button onClick={handleSubscription} key={key} >
        {product.name}
    </button>
    </div>
  )
}

export default ProductCard