import { memo, useEffect, useState } from "react";
import ReactTextTransition, { presets } from "react-text-transition";

const brandText = ["d-", "de", "fact", "tool"];
const suffixText = ["FCT", "centralized", "-checking", "kit"];

function AnimatedBrand({ enabled = true }) {
  const [brandIndex, setBrandIndex] = useState(1);
  const [suffixIndex, setSuffixBrandIndex] = useState(1);

  useEffect(() => {
    if (!enabled) return undefined;

    const intervalId = setInterval(() => {
      setBrandIndex((index) => (index < brandText.length ? index + 1 : index));
      setSuffixBrandIndex((index) =>
        index < suffixText.length ? index + 1 : index
      );
    }, 600);

    return () => clearInterval(intervalId);
  }, [enabled]);

  if (!enabled) {
    return <span className="Navbar-brand-text">d-FCT</span>;
  }

  return (
    <span className="Navbar-brand-animated" aria-label="d-FCT">
      <ReactTextTransition springConfig={presets.gentle} inline>
        {brandText[brandIndex % brandText.length]}
      </ReactTextTransition>
      {suffixText[suffixIndex % suffixText.length]}
    </span>
  );
}

export default memo(AnimatedBrand);
