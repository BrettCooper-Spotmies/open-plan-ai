interface SystemMessageProps {
  content: string;
}

export function SystemMessage({ content }: SystemMessageProps) {
  return (
    <div className="flex justify-center py-2 px-4">
      <span className="text-xs text-muted-foreground italic">{content}</span>
    </div>
  );
}
