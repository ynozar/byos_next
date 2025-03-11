import { PreSatori } from "@/utils/pre-satori";
interface WikipediaArticleProps {
	title?: string;
	extract?: string;
	url?: string;
	thumbnail?: {
		source?: string;
		width?: number;
		height?: number;
	};
}

export default function FetchData({
	title = "",
	extract = "",
	thumbnail = {
		source: "",
		width: 0,
		height: 0,
	},
}: WikipediaArticleProps) {
	return (
		<PreSatori>
			{(transform) => (
				<>
					{transform(
						<div className="flex flex-col w-[800px] h-[480px] bg-white">
							<div className="px-4 border-b border-black">
								<h1 className="text-2xl font-bold text-black">{title}</h1>
							</div>
							<div className="flex flex-1 overflow-hidden">
								<div className="p-4 overflow-y-auto flex-1">
									{thumbnail?.source?.startsWith("https://") && (
										<div className="float-right mr-2">
											<picture>
												{/* YOU CANNOT USE NEXTJS IMAGE COMPONENT HERE, BECAUSE SATORI DOES NOT SUPPORT IT */}
												<source srcSet={thumbnail.source} type="image/webp" />
												<img
													src={thumbnail.source}
													alt={title}
													width={thumbnail.width}
													height={thumbnail.height}
													style={{
														width: "300px",
														height:
															thumbnail.height && thumbnail.width
																? `${Math.round(
																		thumbnail.height * (300 / thumbnail.width),
																	)}px`
																: "auto",
														maxWidth: "300px",
														filter: "contrast(1.6) saturate(0) brightness(0.8)",
													}}
												/>
											</picture>
										</div>
									)}
									<p className="text-black leading-relaxed text-base">
										{extract}
									</p>
								</div>
							</div>
						</div>,
					)}
				</>
			)}
		</PreSatori>
	);
}
