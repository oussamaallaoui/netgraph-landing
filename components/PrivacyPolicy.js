// Body of /confidentialite (#12). Static, no client code. Copy: PO text on issue #12 (to be checked by
// the legal review), plus the founder's 2026-11-21 addition in « Pourquoi nous les utilisons ».
// If what the signup stores (#11) changes, this page and SignupPrivacyNotice change in the same PR.
// [RESPONSABLE] is a placeholder the founder fills before merge.
import Link from 'next/link'
import Logo from './Logo'
import { FOCUS } from './essayer/ui'

const LINK = `rounded text-violet underline underline-offset-2 hover:text-violet-dark ${FOCUS}`
const CONTACT = 'contact@netgraph.app'

function Mail() {
  return (
    <a href={`mailto:${CONTACT}`} className={LINK}>
      {CONTACT}
    </a>
  )
}

function Section({ title, children }) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-ink mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function List({ items }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-violet">
      {items.map(item => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-4 sm:px-6">
          <Link href="/" className={`flex min-h-[44px] items-center gap-2 rounded-lg ${FOCUS}`}>
            <Logo />
            <span className="font-semibold tracking-tight text-ink">NetGraph</span>
            <span className="sr-only">, retour à l&apos;accueil</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12 text-sm leading-relaxed text-slate sm:px-6 sm:py-16 sm:text-base">
        <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Confidentialité</h1>
        <p className="mt-4">
          Cette page explique simplement quelles données NetGraph collecte quand vous vous inscrivez à la beta,
          pourquoi, où elles sont conservées, combien de temps, et comment exercer vos droits. Elle explique aussi ce
          qu&apos;il advient des contacts que vous importez sur la page « Essayer maintenant ».
        </p>

        <Section title="Qui est responsable de vos données">
          <p>
            Vos données d&apos;inscription sont traitées par [RESPONSABLE], qui édite NetGraph. Pour toute question
            sur vos données, écrivez à <Mail />.
          </p>
        </Section>

        <Section title="Les données que nous collectons">
          <p>Quand vous vous inscrivez à la beta, nous enregistrons :</p>
          <List
            items={[
              'votre adresse email ;',
              'votre nom ;',
              'votre entreprise ;',
              'votre rôle ;',
              'la date de votre inscription ;',
              "l'origine de votre inscription (aujourd'hui, toujours la page d'accueil de NetGraph).",
            ]}
          />
          <p>
            C&apos;est tout. Votre inscription ne contient ni votre adresse IP, ni d&apos;informations sur votre
            navigateur.
          </p>
        </Section>

        <Section title="Pourquoi nous les utilisons">
          <p>
            Nous les utilisons uniquement pour la beta de NetGraph : pour vous recontacter à son sujet et,
            d&apos;après votre entreprise et votre rôle, pour choisir qui inviter en premier. Nous ne les vendons
            pas, nous ne les utilisons pas pour de la publicité et nous ne vous inscrivons à aucune autre liste.
          </p>
          <p>
            Vous nous transmettez ces informations vous-même en remplissant le formulaire. Vous pouvez changer
            d&apos;avis à tout moment en nous demandant de les supprimer.
          </p>
        </Section>

        <Section title="Où elles sont conservées">
          <p>
            Vos données d&apos;inscription sont enregistrées dans une base de données de notre prestataire Upstash,
            dans sa région de l&apos;Union européenne, à Francfort (Allemagne). Chez NetGraph, seule la personne
            responsable indiquée plus haut y a accès.
          </p>
          <p>
            Le site est hébergé par Vercel : votre inscription passe par ses serveurs avant d&apos;être enregistrée.
          </p>
        </Section>

        <Section title="Combien de temps nous les gardons">
          <p>
            Nous gardons votre inscription jusqu&apos;à la création de votre compte NetGraph. Si vous nous le
            demandez avant, nous la supprimons plus tôt.
          </p>
        </Section>

        <Section title="Vos droits">
          <p>À tout moment, vous pouvez nous demander :</p>
          <List
            items={[
              "l'accès : savoir quelles données nous avons sur vous et en recevoir une copie ;",
              'la rectification : corriger une donnée inexacte ;',
              'la suppression : effacer votre inscription ;',
              "l'opposition : que nous cessions d'utiliser vos données. Nous ne vous recontacterons alors plus.",
            ]}
          />
          <p>
            Pour cela, écrivez à <Mail /> depuis l&apos;adresse avec laquelle vous vous êtes inscrit, ou indiquez
            cette adresse dans votre message. Nous pourrons vous demander de confirmer qu&apos;elle vous appartient
            avant de traiter votre demande.
          </p>
          <p>
            Si vous estimez que votre demande n&apos;a pas été traitée correctement, vous pouvez vous adresser à la
            CNDP au Maroc, ou à l&apos;autorité de protection des données de votre pays si vous résidez dans
            l&apos;Union européenne.
          </p>
        </Section>

        <Section title="« Essayer maintenant » : vos contacts restent sur votre appareil">
          <p>
            Sur la page « Essayer maintenant », les contacts que vous importez (export LinkedIn, fichier de contacts
            de votre téléphone) sont lus et conservés uniquement dans votre navigateur, sur cet appareil. Ils ne sont
            jamais envoyés à NetGraph, pas plus que votre demande ni les messages proposés.
          </p>
          <p>
            NetGraph n&apos;envoie aucun message à votre place. Si vous ouvrez un message proposé dans votre
            messagerie ou dans WhatsApp, son contenu et le destinataire sont transmis à cette application, comme pour
            tout message que vous écrivez vous-même.
          </p>
          <p>
            Le bouton « Effacer mes données de cet appareil » supprime tout ce que NetGraph a enregistré dans ce
            navigateur. Effacer les données de ce site dans les réglages de votre navigateur supprime aussi tout.
          </p>
        </Section>

        <Section title="Cookies et traceurs">
          <p>
            Ce site ne dépose aucun cookie et n&apos;utilise ni outil de mesure d&apos;audience, ni publicité, ni
            script d&apos;un autre site. C&apos;est pourquoi aucune bannière de cookies ne s&apos;affiche.
          </p>
        </Section>

        <Section title="Mises à jour de cette page">
          <p>
            Si nous changeons la façon dont nous utilisons vos données, nous mettrons cette page à jour et changerons
            la date ci-dessous.
          </p>
          <p>Dernière mise à jour : 21 novembre 2026</p>
        </Section>

        <p className="mt-12">
          <Link href="/" className={`inline-flex min-h-[44px] items-center text-sm font-medium ${LINK}`}>
            Retour à l&apos;accueil
          </Link>
        </p>
      </main>
    </div>
  )
}
