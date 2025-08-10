import { useRef, useEffect, useState } from 'react';
import { Link } from 'wouter';

export default function TestPhaser() {
  const gameRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<string>('Not started');

  const testPhaser = async () => {
    if (!gameRef.current) return;

    setStatus('Testing Phaser import...');
    try {
      // Test 1: Import Phaser
      const Phaser = (await import('phaser')).default;
      setStatus('✅ Phaser imported successfully');
      
      // Test 2: Create minimal game
      setTimeout(() => {
        setStatus('Creating test game...');
        
        const config: Phaser.Types.Core.GameConfig = {
          type: Phaser.AUTO,
          width: 400,
          height: 300,
          backgroundColor: '#2c3e50',
          parent: gameRef.current!,
          scene: {
            create: function() {
              this.add.text(200, 150, 'PHASER WORKS!', {
                fontSize: '24px',
                color: '#00ff00'
              }).setOrigin(0.5);
              
              this.add.text(200, 200, 'Click anywhere to continue', {
                fontSize: '16px',
                color: '#ffffff'
              }).setOrigin(0.5);

              this.input.on('pointerdown', () => {
                console.log('Phaser input working!');
              });
            }
          }
        };

        const game = new Phaser.Game(config);
        setStatus('✅ Test game created successfully!');
      }, 1000);

    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
      console.error('Phaser test error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/games" className="text-cyan-400 hover:text-cyan-300">
            ← Back to Games
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-cyan-400 mb-6">Phaser.js Test</h1>
        
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-bold mb-4">Test Status</h2>
          <p className="text-lg mb-4">{status}</p>
          <button 
            onClick={testPhaser}
            className="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded font-bold"
          >
            Run Phaser Test
          </button>
        </div>

        <div 
          ref={gameRef}
          className="bg-gray-700 border-2 border-cyan-400 rounded-lg min-h-[300px] flex items-center justify-center"
        >
          <p className="text-gray-400">Game will appear here</p>
        </div>
      </div>
    </div>
  );
}