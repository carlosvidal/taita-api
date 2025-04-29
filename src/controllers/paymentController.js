import { PrismaClient } from "@prisma/client";
import { MercadoPagoConfig, Payment } from "mercadopago";

const prisma = new PrismaClient();
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});

// Procesar un pago
export const processPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentMethodId, paymentAmount } = req.body;

    if (!paymentMethodId || !paymentAmount) {
      return res.status(400).json({ error: "Faltan datos de pago requeridos" });
    }

    // Aquí iría la lógica para procesar el pago con MercadoPago
    // Este es un ejemplo simplificado

    // Registrar el pago en la base de datos
    const payment = await prisma.payment.create({
      data: {
        userId,
        amount: paymentAmount,
        status: "processing",
        paymentMethodId,
      },
    });

    return res.status(200).json({
      success: true,
      paymentId: payment.id,
      message: "Pago en procesamiento",
    });
  } catch (error) {
    console.error("Error al procesar el pago:", error);
    return res.status(500).json({ error: "Error al procesar el pago" });
  }
};

// Obtener el estado de un pago
export const getPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;

    if (!paymentId) {
      return res.status(400).json({ error: "ID de pago no proporcionado" });
    }

    // Buscar el pago en la base de datos
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return res.status(404).json({ error: "Pago no encontrado" });
    }

    // Verificar que el pago pertenece al usuario autenticado
    if (payment.userId !== userId) {
      return res
        .status(403)
        .json({ error: "No autorizado para ver este pago" });
    }

    return res.status(200).json({
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      createdAt: payment.createdAt,
    });
  } catch (error) {
    console.error("Error al obtener estado del pago:", error);
    return res.status(500).json({ error: "Error al obtener estado del pago" });
  }
};

// Webhook para MercadoPago: /api/mercadopago/webhook
export const handlePaymentNotification = async (req, res) => {
  try {
    // MercadoPago puede enviar info en body o en query
    const paymentId = req.body.data?.id || req.body.id || req.query['data.id'] || req.query.id;
    const topic = req.body.topic || req.query.topic || req.body.type || req.query.type;

    console.log('Webhook recibido:', { paymentId, topic, body: req.body, query: req.query });

    if (!paymentId || !(topic === 'payment' || topic === 'merchant_order')) {
      return res.status(400).json({ error: 'Notificación inválida' });
    }

    // Obtener detalles del pago desde la API de MercadoPago
    const payment = new Payment(client);
    let paymentDetails;
    try {
      paymentDetails = await payment.get({ id: paymentId });
    } catch (err) {
      console.error('No se pudo obtener detalles del pago:', err);
      return res.status(500).json({ error: 'No se pudo obtener detalles del pago' });
    }

    console.log('Detalles del pago:', paymentDetails);

    // Validar pago aprobado
    if (paymentDetails.status === 'approved') {
      const userId = Number(paymentDetails.external_reference);
      if (!userId) {
        console.error('external_reference (userId) no encontrado en el pago');
        return res.status(400).json({ error: 'external_reference no encontrado' });
      }

      // Detectar si es mensual o anual
      let monthsToAdd = 1;
      if (paymentDetails.additional_info?.items?.[0]?.title?.toLowerCase().includes('anual')) {
        monthsToAdd = 12;
      }

      // Calcular próxima fecha de pago
      const now = new Date();
      const nextPaymentDate = new Date(now.setMonth(now.getMonth() + monthsToAdd));

      // Actualizar el blog
      const blog = await prisma.blog.updateMany({
        where: { adminId: userId },
        data: {
          plan: 'PRO',
          subscriptionStatus: 'ACTIVE',
          subscriptionId: paymentId.toString(),
          nextPaymentDate,
        },
      });

      console.log('Blog actualizado a PRO por pago:', { userId, paymentId, nextPaymentDate });
      return res.status(200).json({ message: 'Plan actualizado a PRO', blog });
    }

    res.status(200).json({ message: 'Notificación recibida' });
  } catch (error) {
    console.error('Error en webhook de MercadoPago:', error);
    res.status(500).json({ error: 'Error procesando webhook' });
  }
};
