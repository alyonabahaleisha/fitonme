import { Sparkles } from 'lucide-react';

const StyleSelector = ({ onSelect, selectedStyle }) => {
  const styles = [
    {
      id: 'feminine',
      label: 'Feminine look',
      description: 'Dresses, skirts, blouses & more',
      emoji: '👗',
    },
    {
      id: 'masculine',
      label: 'Masculine look',
      description: 'Shirts, trousers, suits & more',
      emoji: '👔',
    },
  ];

  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center px-4 py-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-brand/10 mb-1">
            <Sparkles className="w-5 h-5 text-brand" />
          </div>
          <h2 className="text-xl md:text-2xl font-serif font-semibold text-foreground">
            What kind of look would you like?
          </h2>
          <p className="text-sm text-muted-foreground">
            You can change this later
          </p>
        </div>

        {/* Style Options */}
        <div className="space-y-3">
          {styles.map((style) => (
            <button
              key={style.id}
              onClick={() => onSelect(style.id)}
              className={`w-full p-4 rounded-2xl border-2 transition-all duration-300 text-left group ${
                selectedStyle === style.id
                  ? 'border-brand bg-brand/5 shadow-md'
                  : 'border-border bg-white hover:border-brand/50 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{style.emoji}</span>
                <div className="flex-1">
                  <div className="font-semibold text-foreground">
                    {style.label}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {style.description}
                  </div>
                </div>
                {selectedStyle === style.id && (
                  <div className="w-5 h-5 rounded-full bg-brand flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Info text */}
        <p className="text-center text-xs text-muted-foreground">
          This helps us show you relevant outfits.
        </p>
      </div>
    </div>
  );
};

export default StyleSelector;
