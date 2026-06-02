import { FullScreenScrollFX } from './ui/FullScreenScrollFX';

export function SecurifyTrust() {
  const sections = [
    {
      leftLabel: "soc 2 type ii certified",
      title: "enterprise ready compliance",
      rightLabel: "continuous verification",
      background: "/snowboard-1.jpg"
    },
    {
      leftLabel: "zero-knowledge sandbox",
      title: "gdpr & hipaa privacy active",
      rightLabel: "100% browser context",
      background: "/snowboard-2.jpg"
    },
    {
      leftLabel: "mit open source license",
      title: "auditable security rules",
      rightLabel: "community verified",
      background: "/snowboard-3.jpg"
    }
  ];

  return (
    <div className="w-full relative bg-black select-none">
      <FullScreenScrollFX sections={sections} />
    </div>
  );
}
