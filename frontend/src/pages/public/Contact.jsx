import { Helmet } from "react-helmet-async";
export default function Contact() {
  return (
    <div className="container py-5">
      <Helmet>
        <title>Contact Us | EBPE</title>
        <meta name="description" content="Get in touch with EBPE for general, partnership, or media inquiries." />
      </Helmet>
      <h1 className="fw-bold mb-4" style={{ color: "var(--brand-primary)" }}>Contact & Inquiries</h1>
      <p className="lead text-muted mb-5">Get in touch with EBPE for general, partnership, or media inquiries.</p>
      
      <div className="row g-4">
        <div className="col-md-5">
          <div className="card border-0 shadow-sm p-4 h-100">
            <h5 className="fw-bold mb-3">Head Office</h5>
            <p className="mb-1">Kazanchis, Bete Berhan Building, 5th floor</p>
            <p className="mb-1">Addis Ababa, Ethiopia</p>
            <p className="mt-3 mb-1"><strong>Email:</strong> ebpe@ethiobiopharma.et</p>
            <p><strong>Production:</strong> Kilinto Special Economic Zone</p>
          </div>
        </div>
        <div className="col-md-7">
          <div className="card border-0 shadow-sm p-4 h-100">
            <h5 className="fw-bold mb-3">Send us a message</h5>
            <form onSubmit={(e) => { e.preventDefault(); trackEvent("submit", "Contact Form", "Public Inquiry"); alert("Message sent."); }}>
              <div className="row g-3 mb-3">
                <div className="col-6"><label className="form-label small fw-semibold">Full Name</label><input type="text" className="form-control" required /></div>
                <div className="col-6"><label className="form-label small fw-semibold">Email Address</label><input type="email" className="form-control" required /></div>
              </div>
              <div className="mb-3"><label className="form-label small fw-semibold">Message</label><textarea className="form-control" rows={4} required></textarea></div>
              <button type="submit" className="btn-brand">Submit Inquiry</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}