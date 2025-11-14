/**
 * StrokedText Web Component
 * Displays text with a customizable stroke outline using SVG
 *
 * Attributes:
 * - text: The text to display
 * - font-size: Font size (default: 32)
 * - fill: Fill color (default: #fff)
 * - stroke: Stroke color (default: #000)
 * - stroke-width: Stroke width (default: 6)
 * - width: SVG viewBox width (optional, auto-calculated based on text length if not provided)
 * - height: SVG viewBox height (optional, auto-calculated as fontSize * 1.35 if not provided)
 * - font-weight: Font weight (default: 900)
 * - text-anchor: Text anchor position (default: middle)
 * - svg-style: Additional styles for the SVG element (optional)
 */
class StrokedText extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
        this.render();
    }

    static get observedAttributes() {
        return ["text", "font-size", "fill", "stroke", "stroke-width", "width", "height", "font-weight", "text-anchor"];
    }

    attributeChangedCallback() {
        if (this.shadowRoot.children.length > 0) {
            this.render();
        }
    }

    render() {
        const text = this.getAttribute("text") || "";
        const fontSize = Number(this.getAttribute("font-size") || "32");
        const fill = this.getAttribute("fill") || "#fff";
        const stroke = this.getAttribute("stroke") || "#000";
        const strokeWidth = Number(this.getAttribute("stroke-width") || "6");
        const fontWeight = this.getAttribute("font-weight") || "900";
        const textAnchor = this.getAttribute("text-anchor") || "middle";
        const svgStyle = this.getAttribute("svg-style") || "";

        // Calculate dimensions if not provided
        // Height is based on font size + stroke padding
        const height = Number(this.getAttribute("height")) || fontSize * 1.35;

        // Width estimation: ~0.6 * fontSize per character on average for Nunito
        // Add padding for stroke width on both sides
        const estimatedTextWidth = text.length * fontSize * 0.6;
        const padding = strokeWidth * 2;
        const width = Number(this.getAttribute("width")) || estimatedTextWidth + padding;

        // Calculate center position based on text anchor
        const x = textAnchor === "middle" ? width / 2 : textAnchor === "end" ? width : 0;
        const y = height * 0.75; // Position text vertically centered

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: inline-block;
                }
                svg {
                    display: block;
                    font-family: "Nunito", system-ui, -apple-system, sans-serif;
                    ${svgStyle}
                }
            </style>
            <svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
                <text
                    x="${x}"
                    y="${y}"
                    font-size="${fontSize}"
                    font-weight="${fontWeight}"
                    fill="${fill}"
                    stroke="${stroke}"
                    stroke-width="${strokeWidth}"
                    paint-order="stroke fill"
                    stroke-linejoin="round"
                    text-anchor="${textAnchor}"
                >
                    ${text}
                </text>
            </svg>
        `;
    }
}

customElements.define("stroked-text", StrokedText);
