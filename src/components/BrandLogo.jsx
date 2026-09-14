import logo from "../assets/logo.svg";

export default function BrandLogo({ className = "w-9 h-9 rounded-xl", ...props }) {
  return (
    <img
      src={logo}
      alt="FitMind AI logo"
      className={`object-cover ${className}`}
      {...props}
    />
  );
}
