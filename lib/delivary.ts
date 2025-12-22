export type DeliveryOption = {
    id: string;
    type: 'Normal' | 'Expected' | string;
    description: string;
    price: number;
    currency?: string;
};

export const deliveryOptions: DeliveryOption[] = [
    {
        id: 'delivery_normal_001',
        type: 'Normal',
        description: 'Normal Delivery (standard timeframe)',
        price: 30,
        currency: 'INR',
    },
    {
        id: 'delivery_expected_001',
        type: 'Expected',
        description: 'Expected / Express Delivery (faster)',
        price: 50,
        currency: 'INR',
    },
];

export function getDeliveryOptionByType(type?: string) {
    if (!type) return null;
    const t = String(type).trim().toLowerCase();
    return deliveryOptions.find((d) => String(d.type).toLowerCase() === t) || null;
}

export default deliveryOptions;
