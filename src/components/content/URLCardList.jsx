import "../../styles/URLCardList.css";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import { useTranslation } from "react-i18next";

function URLCardList(props) {
  const openInNewTab = (url) => {
    const newWindow = window.open(url, "_blank", "noopener,noreferrer");
    if (newWindow) newWindow.opener = null;
  };

  const truncateString = (string = "", maxLength = 100) => {
    return string.length > maxLength
      ? `${string.substring(0, maxLength)}…`
      : string;
  };

  const getHostname = (url) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url || "";
    }
  };

  const removeCard = (url) => {
    let filtered = props.urls.filter((u) => {
      return !u.url.includes(url);
    });
    props.setURLs(filtered);
  };

  const URLCard = ({ item }) => {
    const { t } = useTranslation();
    const metadata = item?.metadata || {};

    const previewImage =
      metadata["og:image"] &&
      metadata["og:image"].startsWith("http")
        ? metadata["og:image"]
        : metadata["image-array"]
        ? "data:image/png;base64,".concat(metadata["image-array"])
        : null;

    const previewTitle =
      metadata["og:title"] ||
      metadata.title ||
      "";

    return (
      <Card variant="dark" className="Url-card">
        <Card.Img
          className="Url-card-img"
          onClick={() => openInNewTab(item.url)}
          variant="top"
          src={previewImage || "/placeholder.png"}
          style={
            previewImage
              ? { opacity: "1" }
              : { opacity: "0.5" }
          }
          alt="Website image or cover"
        />
        <Card.Body>
          <Card.Title className="Url-card-title">
            {getHostname(item.url)}
          </Card.Title>
          <Card.Text>
            {previewTitle
              ? truncateString(previewTitle)
              : t("fetchURLPreviewUnavailableShort")}
          </Card.Text>
          <Button
            className="Url-card-button"
            onClick={() => removeCard(item.url)}
            variant="secondary"
          >
            {t("removeButton")}
          </Button>
        </Card.Body>
        <Card.Footer>
          <small onClick={() => openInNewTab(item.url)} className="text-muted">
            <i>{item.url}</i>
          </small>
        </Card.Footer>
      </Card>
    );
  };

  return (
    props &&
    props.urls && (
      <div className="Url-card-container">
        {props.urls.map((item, index) => (
          <URLCard
            key={`${item.url || "url"}-${index}`}
            item={item}
          />
        ))}
      </div>
    )
  );
}

export default URLCardList;
