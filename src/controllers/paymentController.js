import { PrismaClient } from "@prisma/client";
import { MercadoPagoConfig, Payment } from "mercadopago";

const prisma = new PrismaClient();
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});

// Manejar notificaciones de pago
export const handlePaymentNotification = async (req, res) => {
  try {
    const { id, type } = req.body;

    if (type === "payment") {
      const payment = new Payment(client);
      const paymentDetails = await payment.get({ id });

      if (paymentDetails.status === "approved") {
        // Actualizar el plan del blog a PRO
        const blog = await prisma.blog.update({
          where: { adminId: paymentDetails.external_reference },
          data: { plan: "PRO" },
        });

        return res
          .status(200)
          .json({ message: "Plan actualizado a PRO", blog });
      }
    }

    res.status(200).json({ message: "Notificación recibida" });
  } catch (error) {
    console.error("Error al procesar notificación:", error);
    res.status(500).json({ error: "Error al procesar notificación" });
  }
};
