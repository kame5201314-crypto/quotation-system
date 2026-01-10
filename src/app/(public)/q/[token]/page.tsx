import { notFound } from 'next/navigation'
import { getQuoteByToken } from '@/actions/quotes'
import { QuotePublicView } from './QuotePublicView'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function PublicQuotePage({ params }: PageProps) {
  const { token } = await params

  const result = await getQuoteByToken(token)

  if (result.error || !result.data) {
    notFound()
  }

  return <QuotePublicView quote={result.data} token={token} />
}
