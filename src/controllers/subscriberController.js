import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { sendMail } from "../utils/mailer.js";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
const MAGIC_LINK_TTL_MINUTES = 30;

/**
 * Resolve blog from request headers/query (tenant detection for public routes).
 */
async function resolveBlog(req) {
  const subdomain =
    req.headers["x-tenant"] ||
    req.headers["x-taita-subdomain"] ||
    req.query.tenant ||
    req.query.subdomain;

  if (!subdomain) return null;

  return prisma.blog.findFirst({ where: { subdomain } });
}

/**
 * POST /subscribe — Register a new subscriber (or re-send magic link for existing).
 * Body: { email, name? }
 */
export const subscribe = async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email is required" });
    }

    const blog = await resolveBlog(req);
    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    // Find or create subscriber
    let subscriber = await prisma.subscriber.findUnique({
      where: {
        subscriber_email_blog_unique: {
          email: email.toLowerCase().trim(),
          blogId: blog.id,
        },
      },
    });

    if (!subscriber) {
      subscriber = await prisma.subscriber.create({
        data: {
          email: email.toLowerCase().trim(),
          name: name || null,
          blogId: blog.id,
        },
      });
    }

    // Generate magic link token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(
      Date.now() + MAGIC_LINK_TTL_MINUTES * 60 * 1000
    );

    await prisma.magicLink.create({
      data: {
        token,
        subscriberId: subscriber.id,
        expiresAt,
      },
    });

    // Build magic link URL
    const blogDomain = blog.subdomain
      ? `https://${blog.subdomain}.taita.blog`
      : "https://taita.blog";
    const magicLinkUrl = `${blogDomain}/magic-link/${token}`;

    // Send email
    await sendMail({
      to: subscriber.email,
      subject: `Tu enlace de acceso a ${blog.name || blog.subdomain}`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
          <h2>Hola${subscriber.name ? ` ${subscriber.name}` : ""}!</h2>
          <p>Haz clic en el siguiente enlace para acceder al contenido exclusivo de <strong>${blog.name || blog.subdomain}</strong>:</p>
          <p style="margin: 24px 0;">
            <a href="${magicLinkUrl}"
               style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
              Acceder al blog
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">Este enlace expira en ${MAGIC_LINK_TTL_MINUTES} minutos.</p>
          <p style="color: #666; font-size: 14px;">Si no solicitaste este enlace, puedes ignorar este correo.</p>
        </div>
      `,
      text: `Accede al contenido exclusivo: ${magicLinkUrl} (expira en ${MAGIC_LINK_TTL_MINUTES} minutos)`,
      fromName: blog.name || "Taita Blog",
    });

    res.json({
      success: true,
      message: "Magic link sent to your email",
    });
  } catch (error) {
    console.error("Error in subscribe:", error);
    res.status(500).json({ error: "Failed to process subscription" });
  }
};

/**
 * GET /verify-magic-link/:token — Verify magic link and return subscriber JWT.
 */
export const verifyMagicLink = async (req, res) => {
  try {
    const { token } = req.params;

    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
      include: {
        subscriber: {
          include: { blog: true },
        },
      },
    });

    if (!magicLink) {
      return res.status(404).json({ error: "Invalid link" });
    }

    if (magicLink.usedAt) {
      return res.status(410).json({ error: "Link already used" });
    }

    if (new Date() > magicLink.expiresAt) {
      return res.status(410).json({ error: "Link expired" });
    }

    // Mark magic link as used
    await prisma.magicLink.update({
      where: { id: magicLink.id },
      data: { usedAt: new Date() },
    });

    // Confirm subscriber email if first time
    if (!magicLink.subscriber.confirmedAt) {
      await prisma.subscriber.update({
        where: { id: magicLink.subscriber.id },
        data: { confirmedAt: new Date() },
      });
    }

    // Issue subscriber JWT
    const subscriberToken = jwt.sign(
      {
        type: "subscriber",
        subscriberId: magicLink.subscriber.id,
        blogId: magicLink.subscriber.blogId,
        tier: magicLink.subscriber.tier,
        email: magicLink.subscriber.email,
      },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      success: true,
      token: subscriberToken,
      subscriber: {
        uuid: magicLink.subscriber.uuid,
        email: magicLink.subscriber.email,
        name: magicLink.subscriber.name,
        tier: magicLink.subscriber.tier,
      },
      blog: {
        uuid: magicLink.subscriber.blog.uuid,
        name: magicLink.subscriber.blog.name,
        subdomain: magicLink.subscriber.blog.subdomain,
      },
    });
  } catch (error) {
    console.error("Error verifying magic link:", error);
    res.status(500).json({ error: "Failed to verify link" });
  }
};

/**
 * GET /me — Get current subscriber profile (requires subscriber JWT).
 */
export const getProfile = async (req, res) => {
  try {
    const subscriber = await prisma.subscriber.findUnique({
      where: { id: req.subscriber.subscriberId },
      include: {
        blog: {
          select: {
            uuid: true,
            name: true,
            subdomain: true,
          },
        },
      },
    });

    if (!subscriber) {
      return res.status(404).json({ error: "Subscriber not found" });
    }

    res.json({
      uuid: subscriber.uuid,
      email: subscriber.email,
      name: subscriber.name,
      tier: subscriber.tier,
      patreonId: subscriber.patreonId ? true : false,
      confirmedAt: subscriber.confirmedAt,
      createdAt: subscriber.createdAt,
      blog: subscriber.blog,
    });
  } catch (error) {
    console.error("Error getting subscriber profile:", error);
    res.status(500).json({ error: "Failed to get profile" });
  }
};
