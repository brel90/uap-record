import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const ERA_GREEN = '#0d6e4a'

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: 10,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.22)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      paddingBottom: 8,
      marginBottom: 20,
      marginTop: 52,
    }}>
      {children}
    </div>
  )
}

function BodyText({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.75, marginBottom: 14 }}>
      {children}
    </p>
  )
}

export default function TermsPage() {
  const navigate = useNavigate()

  return (
    <div className="tl-root">
      {/* Topbar */}
      <div className="tl-topbar">
        <Link to="/" className="tl-topbar-link">Corpus</Link>
        <span className="tl-topbar-sep">/</span>
        <Link to="/about" className="tl-topbar-link">About</Link>
        <span className="tl-topbar-sep">/</span>
        <span className="tl-topbar-active">Terms of Use</span>
      </div>

      {/* Scrollable content */}
      <div className="tl-content">
        <div style={{
          maxWidth: 680,
          margin: '0 auto',
          padding: '72px 32px 96px',
          fontFamily: 'IBM Plex Sans, sans-serif',
        }}>

          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors text-sm mb-4"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>

          {/* Page header */}
          <div style={{ marginBottom: 52 }}>
            <h1 style={{
              fontSize: 36,
              fontWeight: 600,
              color: ERA_GREEN,
              letterSpacing: '-0.02em',
              margin: '0 0 10px',
              fontFamily: 'IBM Plex Sans, sans-serif',
            }}>
              Terms of Use
            </h1>
            <p style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.3)',
              fontFamily: 'IBM Plex Mono, monospace',
              letterSpacing: '0.04em',
            }}>
              Effective May 2026 — uaprecord.com
            </p>
          </div>

          <BodyText>
            By accessing or using UAP Record ("the Site"), you agree to these Terms of Use. If you do not agree, please do not use the Site.
          </BodyText>

          {/* Purpose */}
          <SectionHeading>Purpose and Scope</SectionHeading>
          <BodyText>
            UAP Record is a historical research index. The Site organizes and presents documented events related to the UAP phenomenon, drawing from declassified government documents, congressional records, military reports, and other primary and secondary sources.
          </BodyText>
          <BodyText>
            The Site is intended for informational and research purposes only. Nothing on this Site constitutes legal advice, professional consultation, or verified factual claims beyond what is cited from primary sources.
          </BodyText>

          {/* Accuracy */}
          <SectionHeading>Accuracy and Completeness</SectionHeading>
          <BodyText>
            We make good-faith efforts to accurately represent source material and apply consistent evidentiary standards through our tier system. However, the UAP research record is incomplete, actively evolving, and in some cases contested. Some events are drawn from sources that are themselves disputed.
          </BodyText>
          <BodyText>
            Tier classifications (Tier 1, 2, 3) reflect our editorial judgment about evidentiary quality. They are not legal or scientific determinations. Users should consult primary sources directly for any research, publication, or professional use.
          </BodyText>
          <BodyText>
            The index is updated as new materials become available. Information on the Site may not reflect the most recent developments. We do not guarantee completeness or timeliness.
          </BodyText>

          {/* Intellectual Property */}
          <SectionHeading>Intellectual Property</SectionHeading>
          <BodyText>
            The structure, design, editorial content, and original writing on UAP Record are owned by the Site's operators and are protected by copyright. You may not reproduce, distribute, or republish Site content in bulk without permission.
          </BodyText>
          <BodyText>
            Primary source materials referenced or excerpted on this Site — including declassified government documents, congressional testimony, and public records — belong to their respective originators and are not claimed as the Site's intellectual property. Where such materials are in the public domain, you may use them subject to applicable law.
          </BodyText>
          <BodyText>
            The Archivist AI feature generates responses using language model technology. Those responses are not independently verified research and should not be cited as authoritative sources.
          </BodyText>

          {/* The Archivist */}
          <SectionHeading>The Archivist (AI Feature)</SectionHeading>
          <BodyText>
            The Archivist is an AI-assisted research interface. Its responses are generated by a large language model and are grounded in corpus context, but they may contain inaccuracies, omissions, or misattributions. The Archivist is a research aid, not a definitive reference.
          </BodyText>
          <BodyText>
            Do not rely on Archivist responses for legal, medical, financial, or other professional purposes. Verify all claims against primary sources before use in publication or formal research.
          </BodyText>

          {/* Use of the Site */}
          <SectionHeading>Permitted Use</SectionHeading>
          <BodyText>
            You may use the Site for personal research, education, and non-commercial purposes. You may link to the Site freely. You may quote short passages with attribution.
          </BodyText>
          <BodyText>
            You may not use automated tools to scrape, copy, or republish the Site's content in bulk. You may not use the Site to transmit spam, malware, or any content that violates applicable law.
          </BodyText>

          {/* External Links */}
          <SectionHeading>External Links</SectionHeading>
          <BodyText>
            The Site may link to external sources including government archives, news organizations, and research repositories. We do not control external sites and are not responsible for their content, availability, or accuracy. Links do not imply endorsement.
          </BodyText>

          {/* Privacy */}
          <SectionHeading>Privacy</SectionHeading>
          <BodyText>
            UAP Record does not require account creation or collect personal information beyond standard web server logs (IP addresses, access times, browser types). We do not sell data. We do not track users across sites.
          </BodyText>
          <BodyText>
            The Site uses Supabase for its database infrastructure and Vercel for hosting. Use of the Site is subject to those platforms' applicable data processing terms.
          </BodyText>

          {/* Disclaimers */}
          <SectionHeading>Disclaimers and Limitations</SectionHeading>
          <BodyText>
            The Site is provided "as is" without warranties of any kind, express or implied. We do not warrant that the Site will be uninterrupted, error-free, or free of viruses or other harmful components.
          </BodyText>
          <BodyText>
            To the fullest extent permitted by law, UAP Record and its operators disclaim all liability for any damages arising from your use of the Site, including but not limited to reliance on information contained herein.
          </BodyText>

          {/* Changes */}
          <SectionHeading>Changes to These Terms</SectionHeading>
          <BodyText>
            We may update these Terms from time to time. Continued use of the Site after changes are posted constitutes acceptance of the revised Terms. The effective date at the top of this page reflects the most recent revision.
          </BodyText>

          {/* Contact */}
          <SectionHeading>Contact</SectionHeading>
          <BodyText>
            Questions about these Terms may be directed to:
          </BodyText>
          <a
            href="mailto:uapindexicord@gmail.com"
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 13,
              color: ERA_GREEN,
              textDecoration: 'none',
              letterSpacing: '0.02em',
            }}
          >
            uapindexicord@gmail.com
          </a>

          {/* Footer note */}
          <div style={{
            marginTop: 64,
            paddingTop: 24,
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: 12, lineHeight: 1.6, fontStyle: 'italic' }}>
              These terms govern use of uaprecord.com. The record is still being written.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
