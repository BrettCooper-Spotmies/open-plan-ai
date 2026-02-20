interface TypingIndicatorProps {
  typingNames: string[];
}

export function TypingIndicator({ typingNames }: TypingIndicatorProps) {
  if (!typingNames.length) return null;

  const text =
    typingNames.length === 1
      ? `${typingNames[0]} is typing`
      : typingNames.length === 2
        ? `${typingNames[0]} and ${typingNames[1]} are typing`
        : `${typingNames.length} people are typing`;

  return (
    <div className="flex items-center gap-1 px-4 py-1.5">
      <div className="flex items-center gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
            style={{ animationDelay: `${i * 150}ms`, animationDuration: '0.8s' }}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground ml-1">{text}...</span>
    </div>
  );
}
