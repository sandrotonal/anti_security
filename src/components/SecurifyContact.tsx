import { useState, useEffect } from 'react';

export const SecurifyContact = () => {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('submitted') === 'true';
  });
  const [ticketId, setTicketId] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('submitted') === 'true') {
      window.history.replaceState({}, document.title, window.location.pathname);
      const array = new Uint32Array(2);
      window.crypto.getRandomValues(array);
      setTicketId(`sec_ticket_${array[0].toString(16)}${array[1].toString(16)}`);
    }
  }, []);

  const handleSubmit = () => {
    setIsSubmitting(true);
  };

  const handleReset = () => {
    setName('');
    setEmail('');
    setMessage('');
    setIsSubmitted(false);
    setTicketId('');
  };

  const socialLinks = [
    {
      name: 'twitter (x)',
      url: 'https://x.com/gucluyumhe',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      )
    },
    {
      name: 'instagram',
      url: 'https://instagram.com/00mer04',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      )
    },
    {
      name: 'telegram',
      url: 'https://t.me/islamakhachev',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.24-.213-.054-.33-.373-.12l-6.87 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.46c.536-.196 1.006.128.832.935z"/>
        </svg>
      )
    }
  ];

  return (
    <section 
      id="contact" 
      className="min-h-screen py-32 px-4 flex flex-col justify-center items-center select-none relative"
      style={{
        backgroundImage: `radial-gradient(circle at center, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0.98) 100%), url('/contact-bg.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="max-w-md w-full space-y-8 relative z-10 text-center">
        
        {/* Minimal Header */}
        <div className="space-y-3">
          <span className="inline-block bg-white/5 border border-white/10 rounded-full px-3 py-0.5 text-[9px] font-mono text-neutral-400 lowercase tracking-wider">
            gateway
          </span>
          <h2 className="hero-title text-3xl md:text-4xl font-light tracking-tight text-white lowercase">
            get in touch.
          </h2>
          
          {/* Transparent Clean Social Links */}
          <div className="flex items-center justify-center gap-6 pt-3 select-text">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.name}
                className="text-neutral-400 hover:text-white transition-colors duration-200"
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Minimal Transparent Form Card */}
        <div className="bg-transparent border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
          {!isSubmitted ? (
            <form
              action="https://submify.vercel.app/omeriletisimportfolyo@gmail.com"
              method="POST"
              onSubmit={handleSubmit}
              className="space-y-6 text-left"
            >
              <input 
                type="hidden" 
                name="_next" 
                value={window.location.origin + window.location.pathname + "?submitted=true"} 
              />
              
              {/* Name Input */}
              <div className="space-y-1 select-text">
                <label className="text-[9px] font-mono text-neutral-400 block lowercase">name:</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent border-b border-white/15 focus:border-white/40 focus:outline-none py-2 text-xs text-white placeholder-neutral-600 font-mono transition-colors rounded-none px-0"
                  placeholder="e.g. omer"
                />
              </div>

              {/* Email Input */}
              <div className="space-y-1 select-text">
                <label className="text-[9px] font-mono text-neutral-400 block lowercase">email:</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border-b border-white/15 focus:border-white/40 focus:outline-none py-2 text-xs text-white placeholder-neutral-600 font-mono transition-colors rounded-none px-0"
                  placeholder="e.g. omer@securify.dev"
                />
              </div>

              {/* Message Input */}
              <div className="space-y-1 select-text">
                <label className="text-[9px] font-mono text-neutral-400 block lowercase">message payload:</label>
                <textarea
                  name="message"
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-transparent border-b border-white/15 focus:border-white/40 focus:outline-none py-2 text-xs text-white placeholder-neutral-600 font-mono resize-none transition-colors rounded-none px-0"
                  placeholder="write message payload..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-white hover:bg-neutral-200 disabled:bg-neutral-900 disabled:text-neutral-600 text-black font-mono text-xs font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 lowercase"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    transmitting...
                  </>
                ) : (
                  'transmit payload'
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-5 text-center py-4 animate-in fade-in zoom-in-95 duration-350">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-950/20 border border-emerald-500/10 text-emerald-400 font-mono text-sm">
                ✔
              </div>
              <div className="space-y-1">
                <h3 className="text-white text-xs font-medium lowercase">payload relay success</h3>
                <p className="text-neutral-500 text-[10px] font-light leading-relaxed lowercase max-w-xs mx-auto">
                  your message has been signed and relayed.
                </p>
              </div>

              <div className="space-y-1 bg-black/40 border border-white/5 p-3 rounded-xl max-w-xs mx-auto">
                <span className="text-[8px] font-mono text-neutral-600 lowercase block">ticket hash:</span>
                <code className="text-[9px] text-neutral-300 font-mono select-all break-all block">{ticketId}</code>
              </div>

              <button
                onClick={handleReset}
                className="text-[9px] font-mono text-neutral-500 hover:text-white transition-colors underline lowercase"
              >
                send another payload
              </button>
            </div>
          )}
        </div>

        <div className="text-[8px] font-mono text-neutral-600 lowercase leading-normal">
          locally hashed client transmission.
        </div>

      </div>
    </section>
  );
};


