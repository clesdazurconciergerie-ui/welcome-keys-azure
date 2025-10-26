import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Button,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface ConfirmationEmailProps {
  supabase_url: string
  email_action_type: string
  redirect_to: string
  token_hash: string
  token: string
}

export const ConfirmationEmail = ({
  token,
  supabase_url,
  email_action_type,
  redirect_to,
  token_hash,
}: ConfirmationEmailProps) => {
  const confirmationUrl = `${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`
  
  return (
    <Html>
      <Head />
      <Preview>Confirme ton e-mail pour accéder à ton espace</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={brandName}>Clés d&apos;Azur</Heading>
            <Text style={tagline}>Welkom</Text>
          </Section>

          <Section style={content}>
            <Heading style={h1}>Bienvenue chez Clés d&apos;Azur</Heading>
            <Text style={subtitle}>Confirme ton e-mail pour activer ton compte</Text>
            
            <Text style={text}>
              Merci de t&apos;être inscrit sur notre plateforme. Clique sur le bouton ci-dessous pour vérifier ton e-mail et accéder à ton tableau de bord.
            </Text>

            <Section style={buttonContainer}>
              <Button href={confirmationUrl} style={button}>
                Vérifier mon e-mail
              </Button>
            </Section>

            <Text style={text}>
              Si tu n&apos;es pas à l&apos;origine de cette inscription, ignore simplement cet e-mail.
            </Text>

            <Section style={divider} />

            <Text style={smallText}>
              Si le bouton ne fonctionne pas, copie et colle ce lien dans ton navigateur :
            </Text>
            <Link href={confirmationUrl} style={link}>
              {confirmationUrl}
            </Link>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              © Clés d&apos;Azur — Tous droits réservés.<br />
              Cet e-mail a été envoyé automatiquement.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default ConfirmationEmail

const main = {
  backgroundColor: '#f8f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Poppins", sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '600px',
}

const header = {
  textAlign: 'center' as const,
  marginBottom: '32px',
}

const brandName = {
  color: '#071552',
  fontSize: '32px',
  fontWeight: '700',
  margin: '0',
  padding: '0',
  letterSpacing: '-0.5px',
}

const tagline = {
  color: '#6C6C6C',
  fontSize: '14px',
  fontWeight: '400',
  margin: '8px 0 0 0',
  letterSpacing: '0.5px',
}

const content = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: '48px 40px',
  boxShadow: '0 4px 12px rgba(7, 21, 82, 0.08)',
}

const h1 = {
  color: '#071552',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0 0 12px 0',
  textAlign: 'center' as const,
  lineHeight: '1.3',
}

const subtitle = {
  color: '#6C6C6C',
  fontSize: '16px',
  fontWeight: '500',
  margin: '0 0 32px 0',
  textAlign: 'center' as const,
  lineHeight: '1.5',
}

const text = {
  color: '#333333',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '16px 0',
  textAlign: 'center' as const,
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#071552',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 48px',
  lineHeight: '1',
}

const divider = {
  borderTop: '1px solid #e5e7eb',
  margin: '32px 0',
}

const smallText = {
  color: '#6C6C6C',
  fontSize: '13px',
  lineHeight: '1.5',
  margin: '16px 0 8px 0',
  textAlign: 'center' as const,
}

const link = {
  color: '#071552',
  fontSize: '12px',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
  display: 'block',
  textAlign: 'center' as const,
}

const footer = {
  marginTop: '32px',
  textAlign: 'center' as const,
}

const footerText = {
  color: '#9CA3AF',
  fontSize: '12px',
  lineHeight: '1.6',
  margin: '0',
}
