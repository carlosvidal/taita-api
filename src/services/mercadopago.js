import { MercadoPagoConfig, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });

export const createPayment = async ({ description, price, email }) => {
  const preference = new Preference(client);

  const paymentData = {
    items: [{
      title: description,
      unit_price: price,
      quantity: 1,
    }],
    payer: {
      email,
    },
    back_urls: {
      success: `${process.env.FRONTEND_URL}/payment/success`,
      failure: `${process.env.FRONTEND_URL}/payment/failure`,
      pending: `${process.env.FRONTEND_URL}/payment/pending`,
    },
    auto_return: 'approved',
  };

  return await preference.create({ body: paymentData });
};