import "./Card.css";
import type { CardProps } from "./Card.types";

const Card = ({ title, action, children }: CardProps) => {
    return (
        <div className="bga-card">
            {(title || action) && (
                <div
                    className="bga-card__header"
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    {title && <h3 className="bga-card__title">{title}</h3>}
                    {action && (
                        <div className="bga-card__action">{action}</div>
                    )}
                </div>
            )}
            <div className="bga-card__body">{children}</div>
        </div>
    );
};

export default Card;
