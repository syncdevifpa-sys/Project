/**
 * Arcadia - Configuration for Real Google Authentication & Real Email Delivery
 * ============================================================================
 * 
 * 1. GOOGLE CLIENT ID (for official Google OAuth popup):
 *    - Project: Arcadia IFPA
 *    - Client ID configured below
 * 
 * 2. EMAILJS (for sending real welcome emails to your inbox for free):
 *    - Go to https://www.emailjs.com/ and create a free account
 *    - Add Email Service: choose "Gmail" and connect your email
 *    - Create an Email Template with variables: {{to_name}}, {{to_email}}, {{message}}
 *    - Paste your Service ID, Template ID, and Public Key below:
 */

window.ARCADIA_CONFIG = {
  // Real Google OAuth 2.0 Client ID:
  googleClientId: "206457421738-i2um6qk5cs0be9chqe38kcrqbk9edae4.apps.googleusercontent.com",

  // EmailJS Configuration for sending real emails directly to inboxes:
  emailJsServiceId: "",
  emailJsTemplateId: "",
  emailJsPublicKey: "",

  // Arcadia Backend API endpoint:
  backendUrl: "http://localhost:3001"
};
