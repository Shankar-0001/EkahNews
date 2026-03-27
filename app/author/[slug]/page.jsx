import { permanentRedirect } from 'next/navigation'

export default function AuthorAliasPage({ params }) {
  permanentRedirect(`/authors/${params.slug}`)
}
