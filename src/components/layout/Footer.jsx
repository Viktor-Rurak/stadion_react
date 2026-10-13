// Підвал сайту: назва, адреса, пошта.
export default function Footer() {
  return (
    <footer id="contacts" className="footer">
      <div className="footer-inner">
        <span className="footer-brand">Стадіон</span>
        <span>Дубівці, Чернівецька область, 59334</span>
        {/* mailto: — натиснувши, людина одразу пише листа */}
        <a className="footer-mail" href="mailto:stadion.dubivtsi@gmail.com">
          stadion.dubivtsi@gmail.com
        </a>
        <span>Благодійний проєкт · 2026</span>
      </div>
    </footer>
  );
}
