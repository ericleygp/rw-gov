import { getCompanyProfile } from './repositories/companyProfileRepository.js'
import './CompanyProfilePage.css'

const company = getCompanyProfile()

function CompanyProfilePage() {
  return <div className="company-page">
    <div className="company-demo-banner"><span>i</span><div><strong>Perfil da empresa ainda não configurado</strong><small>Somente o nome e o CNPJ foram fornecidos. Os demais campos não foram presumidos.</small></div></div>
    <section className="company-heading"><div><span className="eyebrow">PERFIL COMERCIAL</span><h1>Empresa</h1><p>Consulte e, futuramente, configure a capacidade comercial da R W Comercial.</p></div><span className="company-state-pill"><i /> Configuração inicial</span></section>
    <section className="company-identity panel"><div className="company-monogram">RW</div><div className="company-identity-copy"><span className="eyebrow">EMPRESA</span><h2>{company.name}</h2><p>CNPJ <strong>{company.cnpj}</strong></p></div><span className="identity-known">2 dados informados</span></section>

    <div className="company-content-grid">
      <div className="company-main-column">
        <section className="panel company-section"><SectionHeading title="Localização" description="Endereço e área geográfica de atuação" /><div className="company-field-grid"><CompanyField label="Localização" value={company.location} /><CompanyField label="Estado" value={company.state} /></div><div className="company-subsection"><div><strong>Cobertura</strong><small>Municípios e regiões atendidos</small></div><span className="not-configured-pill">{company.serviceAreas}</span></div></section>
        <section className="panel company-section"><SectionHeading title="Categorias" description="Categorias apresentadas na amostra do catálogo" /><div className="category-reference-note">Categorias fornecidas para a amostra demonstrativa; ainda não confirmadas como perfil comercial da empresa.</div><div className="company-category-list">{company.productCategories.map((category) => <span key={category}>{category}</span>)}</div><small className="company-data-level">{company.productCategoriesStatus}</small></section>
        <section className="panel company-section"><SectionHeading title="Capacidade" description="Limites atuais de atendimento comercial" /><div className="company-field-grid"><CompanyField label="Capacidade financeira" value={company.financialCapacity} /><CompanyField label="Capacidade logística" value={company.logisticsCapacity} /><CompanyField label="Capacidade de estoque" value={company.stockCapacity} /></div></section>
      </div>
      <aside className="company-side-column"><section className="panel company-section future-config-section"><SectionHeading title="Configurações futuras" description="Informações necessárias para análises posteriores" /><FutureConfig title="Margem mínima desejada" value={company.minimumDesiredMargin} icon="%" /><FutureConfig title="Fornecedores" value={company.suppliers} icon="⇄" /><FutureConfig title="Documentação" value={company.documentation} icon="▤" /></section><section className="panel company-section company-observations"><SectionHeading title="Observações" description="Notas sobre os dados do perfil" /><p>{company.observations}</p><div className="profile-source-note"><span>i</span> Os campos “Não configurado” e “A confirmar” não representam ausência real; indicam que o dado ainda não foi fornecido.</div></section></aside>
    </div>
    <div className="company-footer-note">Perfil local demonstrativo <span>·</span> Nenhuma informação comercial foi inferida</div>
  </div>
}

function SectionHeading({ title, description }) {
  return <div className="company-section-heading"><div><h2>{title}</h2><p>{description}</p></div><span className="section-menu" aria-hidden="true">···</span></div>
}

function CompanyField({ label, value }) {
  return <div className="company-field"><small>{label}</small><strong>{value}</strong></div>
}

function FutureConfig({ title, value, icon }) {
  return <div className="future-config-row"><span className="future-config-icon">{icon}</span><span><strong>{title}</strong><small>{value}</small></span><i>Não configurado</i></div>
}

export default CompanyProfilePage
