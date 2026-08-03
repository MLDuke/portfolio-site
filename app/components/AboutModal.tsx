import { aboutLinks } from "../data/portfolio";

type AboutModalProps = {
  onClose: () => void;
};

export function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center px-16 pt-72"
      role="dialog"
    >
      <button
        aria-label="Close information modal"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <div className="relative grid w-full max-w-[600px] grid-cols-[minmax(0,0.5fr)_minmax(0,1fr)] gap-x-16 overflow-hidden rounded-[2px] bg-[#232e39] px-20 py-24 text-body-medium text-[#f9fcff] shadow-overlay">
        <p className="row-span-2">About</p>
        <p className="row-span-2 text-[#d9dfe7]">
          About me description in lorem ipsum dolor sitAbout me description in
          lorem ipsum dolor sitAbout me description in lorem ipsum dolor
          sitAbout me description in lorem ipsum dolor sitAbout me description
          in lorem ipsum dolor sitAbout me description in lorem ipsum dolor sit
        </p>

        <div className="col-span-2 h-64" />

        <p>Connect</p>
        <div className="grid gap-16 text-[#d9dfe7]">
          {aboutLinks.slice(0, 2).map((link) => (
            <a
              className="underline underline-offset-2"
              href={link.href}
              key={link.label}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="col-span-2 h-64" />

        <p>Contact</p>
        <div className="grid gap-16 text-[#d9dfe7]">
          {aboutLinks.slice(2).map((link) => (
            <a
              className="underline underline-offset-2"
              href={link.href}
              key={link.label}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
