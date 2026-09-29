import { useEffect } from 'react'
import {
  getCanonicalUrl,
  getFallbackOgImage,
  truncateDescription,
} from '../utils/seo'

export interface SEOProps {
  title: string
  description?: string | null
  canonicalPath?: string
  ogType?: 'website' | 'article' | 'business.business'
  ogImage?: string | null
  twitterCard?: 'summary' | 'summary_large_image'
  structuredData?: Record<string, unknown> | null
  noindex?: boolean
}

const DEFAULT_TITLE = 'SuperHosur — Hosur Local Commerce & Industrial Marketplace'
const DEFAULT_DESC =
  'Discover verified businesses, industrial suppliers, commercial services, and real estate properties in Hosur, Tamil Nadu. Post requirements, compare quotes, and connect directly with trusted local vendors.'
const JSONLD_SCRIPT_ID = 'superhosur-jsonld'

function setMetaTag(name: string, content: string | null | undefined, attr: 'name' | 'property' = 'name'): void {
  let element = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null

  if (!content) {
    if (element) {
      element.remove()
    }
    return
  }

  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attr, name)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function setCanonicalTag(url: string | null | undefined): void {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null

  if (!url) {
    if (link) {
      link.remove()
    }
    return
  }

  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', url)
}

function setStructuredData(data: Record<string, unknown> | null | undefined): void {
  let script = document.getElementById(JSONLD_SCRIPT_ID) as HTMLScriptElement | null

  if (!data) {
    if (script) {
      script.remove()
    }
    return
  }

  if (!script) {
    script = document.createElement('script')
    script.id = JSONLD_SCRIPT_ID
    script.type = 'application/ld+json'
    document.head.appendChild(script)
  }

  try {
    script.textContent = JSON.stringify(data, null, 2)
  } catch (err) {
    console.warn('[SuperHosur SEO] Failed to serialize JSON-LD structured data:', err)
  }
}

export function SEO({
  title,
  description,
  canonicalPath,
  ogType = 'website',
  ogImage,
  twitterCard,
  structuredData,
  noindex = false,
}: SEOProps) {
  useEffect(() => {
    // 1. Dynamic document title
    const formattedTitle = title && title.trim() ? title.trim() : DEFAULT_TITLE
    document.title = formattedTitle

    // 2. Meta description
    const formattedDesc = truncateDescription(description, 160, DEFAULT_DESC)
    setMetaTag('description', formattedDesc, 'name')

    // 3. Robots meta
    if (noindex) {
      setMetaTag('robots', 'noindex, nofollow', 'name')
      setCanonicalTag(null)
    } else {
      setMetaTag('robots', 'index, follow', 'name')
      const canonicalUrl = getCanonicalUrl(canonicalPath || window.location.pathname)
      setCanonicalTag(canonicalUrl)
    }

    // 4. OpenGraph metadata
    const activeOgImage = ogImage || getFallbackOgImage()
    const activeUrl = getCanonicalUrl(canonicalPath || window.location.pathname)

    setMetaTag('og:title', formattedTitle, 'property')
    setMetaTag('og:description', formattedDesc, 'property')
    setMetaTag('og:type', ogType, 'property')
    setMetaTag('og:url', activeUrl, 'property')
    setMetaTag('og:image', activeOgImage, 'property')
    setMetaTag('og:site_name', 'SuperHosur', 'property')

    // 5. Twitter metadata
    const activeCard = twitterCard || (ogImage ? 'summary_large_image' : 'summary')
    setMetaTag('twitter:card', activeCard, 'name')
    setMetaTag('twitter:title', formattedTitle, 'name')
    setMetaTag('twitter:description', formattedDesc, 'name')
    setMetaTag('twitter:image', activeOgImage, 'name')

    // 6. JSON-LD Structured Data
    if (!noindex && structuredData) {
      setStructuredData(structuredData)
    } else {
      setStructuredData(null)
    }

    // Cleanup on unmount or route change
    return () => {
      setStructuredData(null)
    }
  }, [title, description, canonicalPath, ogType, ogImage, twitterCard, structuredData, noindex])

  return null
}
