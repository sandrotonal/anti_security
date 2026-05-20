import { useEffect, useRef, useCallback } from 'react';

export const SecurifyHero = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playedRef = useRef(false);

  const tryPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || playedRef.current) return;
    video.play().then(() => { playedRef.current = true; }).catch(() => {});
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    tryPlay();
    video.addEventListener('canplay', tryPlay);
    video.addEventListener('loadedmetadata', tryPlay);
    document.addEventListener('touchstart', tryPlay, { once: true });
    document.addEventListener('click', tryPlay, { once: true });
    return () => {
      video.removeEventListener('canplay', tryPlay);
      video.removeEventListener('loadedmetadata', tryPlay);
      document.removeEventListener('touchstart', tryPlay);
      document.removeEventListener('click', tryPlay);
    };
  }, [tryPlay]);

  return (
    <section className="relative h-screen w-full overflow-hidden bg-black select-none">
      {/* Background Video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_063509_7d167302-4fd4-480b-8260-18ab572333d4.mp4"
          type="video/mp4"
        />
      </video>

      {/* Dark Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />

      {/* Foreground Content Wrapper */}
      <div className="relative h-full w-full z-10 pointer-events-none">
        <main className="h-full w-full max-w-7xl mx-auto relative">
          
          {/* Staggered Headlines */}
          <h1 className="hero-title absolute text-white font-medium text-[14vw] md:text-[13vw] left-4 md:left-10 top-[18%] lowercase select-none">
            protect
          </h1>
          <h1 className="hero-title absolute text-white font-medium text-[14vw] md:text-[13vw] right-4 md:right-10 top-[38%] lowercase select-none">
            your
          </h1>
          <h1 className="hero-title absolute text-white font-medium text-[14vw] md:text-[13vw] left-[18%] md:left-[28%] top-[58%] lowercase select-none">
            data
          </h1>

          {/* Description Paragraph */}
          <p className="absolute left-6 md:left-10 top-[46%] max-w-[240px] text-[15px] leading-snug text-white/90 lowercase select-none font-light">
            we can guarding your data with utmost care, empowering you with privacy everywhere
          </p>



        </main>
      </div>

      {/* Bottom Gradient Overlay */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent to-black" />
    </section>
  );
};
