import { connection } from "next/server";

// Datos del titular exigidos por la LSSI (art. 10). Se leen del entorno en
// tiempo de ejecución para no versionar datos personales:
//   LEGAL_OWNER_NAME="Nombre y apellidos o razón social"
//   LEGAL_TAX_ID="NIF"
//   LEGAL_ADDRESS="Domicilio fiscal completo"
export async function getLegalOwner() {
  await connection();
  return {
    name: process.env.LEGAL_OWNER_NAME || "IconicoSpace",
    taxId: process.env.LEGAL_TAX_ID || null,
    address: process.env.LEGAL_ADDRESS || null,
    email: "hola@iconicospace.com",
  };
}
