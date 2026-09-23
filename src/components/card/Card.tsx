import "./Card.css";
import type { CardProps } from "./Card.types";

export const Card: React.FC<CardProps> = ({ title, action, children }) => {
    return (
        <div className="dixi-card">
            {(title || action) && (
                <div
                    className="dixi-card__header"
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    {title && <h3 className="dixi-card__title">{title}</h3>}
                    {action && (
                        <div className="dixi-card__action">{action}</div>
                    )}
                </div>
            )}
            <div className="dixi-card__body">{children}</div>
        </div>
    );
};

export default Card;
