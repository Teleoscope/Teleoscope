'use client';

import axios from 'axios';
import { Button } from '@/components/ui/button';
import Stripe from 'stripe';
import { useUserContext } from '@/context/UserContext';

const ProductCard = ({
    product,
    key
}: {
    product: Stripe.Product;
    key: string;
}) => {
    const { userId } = useUserContext()
    // POST request
    const handleSubscription = async (
        e: React.MouseEvent<HTMLButtonElement, MouseEvent>
    ) => {
        e.preventDefault();

        const { data } = await axios.post(
            '/api/payment',
            {
                product: product,
                userId: userId
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
        window.location.assign(data.url);
    };
    return (
        <div>
            <Button onClick={(e) => handleSubscription(e)} key={key}>
                {product.name}
            </Button>
        </div>
    );
};

export default ProductCard;
