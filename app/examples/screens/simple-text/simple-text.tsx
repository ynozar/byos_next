
import { PreSatori } from "@/utils/pre-satori";

export default function SimpleText() {
    return (
        <PreSatori>{(transform) => (<>{transform( // required as parent cannot access children props, so we need to pass the transform function to the children
            <div className="w-[800px] h-[480px] bg-white flex flex-col items-center justify-center">
                <div className="text-4xl font-bold text-black">Hello World</div>
                <div className="text-2xl font-bold text-black">Time now: {new Date().toLocaleTimeString()}</div>
            </div>
        )}</>)}</PreSatori>
    );
}
