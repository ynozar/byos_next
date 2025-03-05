
import { PreSatori } from "@/utils/pre-satori";

export default function SimpleText() {
    return (
        <PreSatori>{(transform) => (<>{transform( // required as parent cannot access children props, so we need to pass the transform function to the children
            <div className="w-[800px] h-[480px] bg-white flex flex-col items-center justify-center">
                <div className="text-4xl font-bold">Hello World</div>
            </div>
        )}</>)}</PreSatori>
    );
}
