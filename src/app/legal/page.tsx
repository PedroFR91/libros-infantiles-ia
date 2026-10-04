import type { Metadata } from "next";
import Link from "next/link";
import { getLegalOwner } from "@/lib/legal";
import { PRINT_ENABLED } from "@/lib/pricing";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Aviso legal",
  description: "Aviso legal e información del titular de LibrosIA.",
};

export default async function LegalPage() {
  const owner = await getLegalOwner();
  return (
    <LegalLayout title='Aviso legal' updated='4 de octubre de 2026'>
      <h2>1. Datos del titular</h2>
      <p>
        En cumplimiento del artículo 10 de la Ley 34/2002, de Servicios de la
        Sociedad de la Información y de Comercio Electrónico (LSSI-CE):
      </p>
      <div className='overflow-x-auto mb-4 rounded-xl border border-border'>
        <table>
          <tbody>
            <tr>
              <th scope='row'>Titular</th>
              <td>
                {owner.name}
                {owner.name !== "IconicoSpace" && " (marca comercial IconicoSpace)"}
              </td>
            </tr>
            {owner.taxId && (
              <tr>
                <th scope='row'>NIF</th>
                <td>{owner.taxId}</td>
              </tr>
            )}
            {owner.address && (
              <tr>
                <th scope='row'>Domicilio</th>
                <td>{owner.address}</td>
              </tr>
            )}
            <tr>
              <th scope='row'>Email</th>
              <td>
                <a href={`mailto:${owner.email}`}>{owner.email}</a>
              </td>
            </tr>
            <tr>
              <th scope='row'>Web</th>
              <td>libros.iconicospace.com</td>
            </tr>
            <tr>
              <th scope='row'>Actividad</th>
              <td>
                Creación y venta de cuentos infantiles personalizados, en
                formato digital
                {PRINT_ENABLED ? " e impreso" : " (y, próximamente, impreso)"}.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>2. Objeto</h2>
      <p>
        Este aviso legal regula el acceso y el uso del sitio web
        libros.iconicospace.com (LibrosIA).
      </p>

      <h2>3. Acceso y uso</h2>
      <p>
        El acceso a la web es libre y gratuito, y crear la historia y la
        portada de un cuento también lo es. La compra de cuentos ilustrados,
        {PRINT_ENABLED
          ? " en PDF o impresos,"
          : " de momento solo en PDF (el impreso llegará próximamente),"}{" "}
        se rige por los{" "}
        <Link href='/terminos'>términos y condiciones</Link>. Te comprometes a
        usar la web de buena fe y conforme a la ley.
      </p>

      <h2>4. Propiedad intelectual e industrial</h2>
      <p>
        Los contenidos de la web (textos, diseño, código, logotipos y marca)
        pertenecen a IconicoSpace o a sus licenciantes. Los cuentos que crean
        los usuarios se rigen por lo indicado en los{" "}
        <Link href='/terminos'>términos y condiciones</Link>.
      </p>

      <h2>5. Responsabilidad</h2>
      <p>
        Trabajamos para que la web funcione bien y sea segura, pero no
        respondemos de interrupciones o errores por causas ajenas a nosotros
        ni de daños causados por intrusiones de terceros. Los textos e
        ilustraciones de los cuentos se generan con inteligencia artificial y
        puedes revisarlos y editarlos antes de comprar o de imprimir.
      </p>

      <h2>6. Reclamaciones</h2>
      <p>
        Si tienes un problema, escríbenos primero a{" "}
        <a href={`mailto:${owner.email}`}>{owner.email}</a>. También puedes
        acudir a los servicios de consumo de tu comunidad autónoma o a la
        Junta Arbitral de Consumo.
      </p>

      <h2>7. Legislación aplicable</h2>
      <p>
        Este aviso legal se rige por la legislación española. En caso de
        conflicto con un consumidor, son competentes los juzgados de su
        domicilio.
      </p>
    </LegalLayout>
  );
}
