
import { PreSatori } from "@/utils/pre-satori";

export default function BitmapPatterns() {
    // Define an array of dither values and their corresponding percentages
    const ditherValues = [
        { value: 0, percentage: "0%" },
        { value: 15, percentage: "1.5%" },
        { value: 25, percentage: "2.5%" },
        { value: 50, percentage: "5%" },
        { value: 100, percentage: "10%" },
        { value: 150, percentage: "15%" },
        { value: 250, percentage: "25%" },
        { value: 300, percentage: "30%" },
        { value: 400, percentage: "40%" },
        { value: 450, percentage: "45%" },
        { value: 500, percentage: "50%" },
        { value: 550, percentage: "55%" },
        { value: 600, percentage: "60%" },
        { value: 700, percentage: "70%" },
        { value: 750, percentage: "75%" },
        { value: 850, percentage: "85%" },
        { value: 900, percentage: "90%" },
        { value: 950, percentage: "95%" },
        { value: 975, percentage: "97.5%" },
        { value: 985, percentage: "98.5%" },
        { value: 1000, percentage: "100%" }
    ];

    // Calculate the RGB value based on dither value (0-1000 scale where 1000 is black)
    const calculateRgbValue = (ditherValue: number) => {
        // Convert from 0-1000 scale to 255-0 scale (inverted because 1000 = black)
        const colorValue = Math.max(0, Math.min(255, Math.round(255 - (ditherValue / 1000 * 255))));
        return `rgb(${colorValue},${colorValue},${colorValue})`;
    };

    // Calculate row height to evenly distribute across the container
    const rowHeight = 480 / ditherValues.length;

    return (
        <PreSatori>{(transform) => (<>{transform( // required as parent cannot access children props, so we need to pass the transform function to the children
            <div className="w-[800px] h-[480px] bg-white flex flex-col">
                {ditherValues.map(({ value, percentage }) => (
                    <div key={value} className="flex items-center" style={{ height: `${rowHeight}px` }}>
                        <div className={`dither dither-${value} font-bold font-mono ${value < 500 ? 'text-black' : ''} w-[650px] h-full flex items-center`}>
                            8x8 pattern, dither-{value}
                        </div>
                        <div
                            className="w-[150px] h-full text-center flex"
                            style={{ backgroundColor: calculateRgbValue(value) }}
                        >
                            <span className={`text-xs font-mono ${value < 500 ? 'text-black' : 'text-white'}`}>{percentage}</span>
                        </div>
                    </div>
                ))}
            </div>
        )}</>)}</PreSatori>
    );
}
