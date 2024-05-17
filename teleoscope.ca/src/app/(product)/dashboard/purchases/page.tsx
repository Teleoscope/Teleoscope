'use client'
import axios from "axios";
import { useState, useEffect } from "react";
import ProductCard from "@/components/ProductCard";


export default function Purchases() {  
    const [products, setProducts] = useState([]);

    useEffect(() => {
        fetchProducts()
    }, [])

    const fetchProducts = async () => {
        const { data } = await axios.get('/api/products')
        setProducts(data)
    }
  
    const plan = "Student";
    const amount_collaborators_total = 1;
    const amount_teams_total = 1;
    const amount_storage_total = 500; // Mb
    const amount_tokens_total = 100000;
    const plan_token_topup = 100000;
    const extra_tokens = 100;
    return (
      <main>
        <div>
          <h1>Purchases</h1>
            <h2>Subscription</h2>
                <p>You are currently on the {plan} plan.</p> That means you get to allocate the following resources:
                <p>You can collaborate with up to {amount_collaborators_total} other people.</p>
                <p>You can manage up to {amount_teams_total}</p>
                <p>You can store up to {amount_storage_total} megabytes of data total.</p>
                <p>You can perform up to {amount_tokens_total} tokens of computation this month. Your plan gives you an extra {plan_token_topup} per month that do not carry over, and you have purchased {extra_tokens} that will carry over until you use them.</p>
                <p>A token is equivalent to vectorizing a single document. 
                    Many operations on the Teleoscope interface take very little computation power, 
                    and come unlimited with any subscription. However, a few operations are expensive,
                    and require significantly more computational power to run.</p>
                <p>Every time you upload a document, that uses {1} token.</p>
                <p>Every time you update an annotation, that uses {0.1} tokens.</p>
                <p>Every time you run a projection, that uses {0.1} token per input document.</p>

            <h2>Pay per use</h2>
                <p>Buy more storage</p>
                <p>Buy more tokens</p>
                <p>Upgrade your plan to manage more teams and collaborators.</p>
                {products && products.map((product) => (
                    <ProductCard product={product} key={product.id} />
                ))}

        </div>
      </main>
    );
}
