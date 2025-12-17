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
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand/10 mb-2">
            <Sparkles className="w-6 h-6 text-brand" />
          </div>
          <h2 className="text-2xl md:text-3xl font-serif font-semibold text-foreground">
            What kind of look would you like to try?
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
              className={`w-full p-5 rounded-2xl border-2 transition-all duration-300 text-left group ${
                selectedStyle === style.id
                  ? 'border-brand bg-brand/5 shadow-md'
                  : 'border-border bg-white hover:border-brand/50 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">{style.emoji}</span>
                <div className="flex-1">
                  <div className="font-semibold text-foreground text-lg">
                    {style.label}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {style.description}
                  </div>
                </div>
                {selectedStyle === style.id && (
                  <div className="w-6 h-6 rounded-full bg-brand flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          This helps us show you relevant outfits. It&apos;s about the style, not identity.
        </p>
      </div>
    </div>
  );
};

export default StyleSelector;
