import { PrismaClient } from "@prisma/client";
import { MercadoPagoConfig, Preference } from "mercadopago";

const prisma = new PrismaClient();
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});

// Obtener el estado de la suscripción del usuario actual
export const getSubscriptionStatus = async (req, res) => {
  try {
    // Verificar que el usuario esté autenticado
    if (!req.user) {
      return res
        .status(401)
        .json({ error: "No autorizado. Token no proporcionado o inválido" });
    }

    const userId = req.user.id;

    // Buscar la suscripción del usuario
    const blog = await prisma.blog.findUnique({
      where: { adminId: userId },
      select: {
        plan: true,
        subscriptionId: true,
        subscriptionStatus: true,
        nextPaymentDate: true,
      },
    });

    if (!blog) {
      return res.status(404).json({ error: "Blog no encontrado" });
    }

    // Determinar el estado de la suscripción
    const status =
      blog.subscriptionStatus || (blog.plan === "PRO" ? "ACTIVE" : "NONE");

    return res.status(200).json({
      status: status,
      plan: blog.plan || "FREE",
      next_payment_date: blog.nextPaymentDate || null,
      subscription_id: blog.subscriptionId || null,
    });
  } catch (error) {
    console.error("Error al obtener estado de suscripción:", error);
    return res
      .status(500)
      .json({ error: "Error al obtener el estado de la suscripción" });
  }
};

// Crear una preferencia de pago con MercadoPago
export const createPaymentPreference = async (req, res) => {
  try {
    const { plan, interval } = req.body;
    const userId = req.user.id;

    // Obtener información del usuario
    const admin = await prisma.admin.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!admin) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Determinar precio según el plan y el intervalo
    let price = 0;
    let description = "";

    if (plan === "PRO") {
      if (interval === "monthly") {
        price = 9.99;
        description = "Suscripción PRO mensual";
      } else if (interval === "yearly") {
        price = 99.99;
        description = "Suscripción PRO anual";
      }
    }

    if (price === 0) {
      return res.status(400).json({ error: "Plan o intervalo no válido" });
    }

    const preference = new Preference(client);

    const paymentData = {
      items: [
        {
          title: description,
          unit_price: price,
          quantity: 1,
        },
      ],
      payer: {
        email: admin.email,
        name: admin.name,
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL}/settings?payment=success`,
        failure: `${process.env.FRONTEND_URL}/settings?payment=failure`,
        pending: `${process.env.FRONTEND_URL}/settings?payment=pending`,
      },
      auto_return: "approved",
      external_reference: userId.toString(),
    };

    let result;
    try {
      result = await preference.create({ body: paymentData });
    } catch (error) {
      console.error('Error al crear preferencia de pago con MercadoPago:', error);
      return res.status(500).json({ error: 'No se pudo crear la preferencia de pago', mp_error: error });
    }

    // Validar que el payment_url exista
    const payment_url = result.init_point || result.sandbox_init_point;
    if (!payment_url) {
      console.error('No se pudo obtener el payment_url de MercadoPago:', result);
      return res.status(500).json({ error: 'No se pudo generar el enlace de pago de MercadoPago' });
    }

    return res.status(200).json({
      payment_url,
      preference_id: result.id,
      init_point: result.init_point,
    });
  } catch (error) {
    console.error("Error al crear preferencia de pago:", error);
    return res
      .status(500)
      .json({ error: "Error al crear preferencia de pago" });
  }
};
