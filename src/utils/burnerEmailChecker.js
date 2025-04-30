// utils/burnerEmailChecker.js
// Utilidad para detectar dominios de email temporales/desechables con caché en memoria

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta al archivo JSON de dominios
const DOMAINS_JSON_PATH = path.join(__dirname, 'burner-domains.json');

// Caché en memoria (Set para consultas rápidas)
let burnerDomainsCache = null;

function loadBurnerDomains() {
  if (burnerDomainsCache) return burnerDomainsCache;
  const raw = fs.readFileSync(DOMAINS_JSON_PATH, 'utf-8');
  const domains = JSON.parse(raw);
  burnerDomainsCache = new Set(domains);
  return burnerDomainsCache;
}

/**
 * Extrae el dominio de un email
 */
function extractDomain(email) {
  if (!email || typeof email !== 'string') return null;
  const parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : null;
}

/**
 * Verifica si el email es temporal/desechable
 * @param {string} email
 * @returns {boolean}
 */
function isBurnerEmail(email) {
  const domain = extractDomain(email);
  if (!domain) return false;
  const burnerDomains = loadBurnerDomains();
  return burnerDomains.has(domain);
}

/**
 * Devuelve el tipo de email
 * @param {string} email
 * @returns {'REGULAR'|'BURNER'|'DISPOSABLE'}
 */
function getEmailType(email) {
  return isBurnerEmail(email) ? 'BURNER' : 'REGULAR';
}

export { isBurnerEmail, getEmailType, extractDomain, loadBurnerDomains };

