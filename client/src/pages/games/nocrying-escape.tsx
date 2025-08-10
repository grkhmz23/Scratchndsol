import { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import { DemoBanner } from '@/components/demo-banner';
import { Button } from '@/components/ui/button';
import logoPath from '@assets/ChatGPT Image 28 juil. 2025, 10_17_36_1753690663892.png';

export default function NoCryingEscape() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(() => {
    return parseInt(localStorage.getItem('nocrying-best-score') || '0');
  });

  useEffect(() => {
    // Save best score to localStorage
    localStorage.setItem('nocrying-best-score', bestScore.toString());
  }, [bestScore]);

  const startGame = () => {
    console.log('startGame called, current gameState:', gameState);
    setGameState('playing');
    setScore(0);
    // Initialize Phaser game here
    initGame().catch(error => {
      console.error('Failed to initialize game:', error);
      setGameState('menu');
      if (gameContainerRef.current) {
        gameContainerRef.current.innerHTML = `
          <div class="text-center text-red-400 p-8">
            <p class="text-xl font-bold">Game Failed to Start</p>
            <p class="text-sm mt-2">${error.message}</p>
            <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-red-600 rounded">Reload Page</button>
          </div>
        `;
      }
    });
  };

  const endGame = (finalScore: number) => {
    setGameState('gameover');
    setScore(finalScore);
    if (finalScore > bestScore) {
      setBestScore(finalScore);
    }
  };

  const initGame = async () => {
    if (!gameContainerRef.current) return;

    try {
      console.log('Starting Phaser game initialization...');
      
      // Show loading state immediately
      if (gameContainerRef.current) {
        gameContainerRef.current.innerHTML = `
          <div class="flex items-center justify-center h-full">
            <div class="text-center">
              <div class="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p class="text-cyan-400 font-bold">Loading Game...</p>
              <p class="text-gray-400 text-sm mt-2">Initializing Phaser.js</p>
            </div>
          </div>
        `;
      }

      // Small delay to show loading
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Dynamically import Phaser
      const Phaser = (await import('phaser')).default;
      console.log('Phaser loaded successfully');

      // Clear loading content
      if (gameContainerRef.current) {
        gameContainerRef.current.innerHTML = '';
      }

      // Create a custom scene class
      class GameScene extends Phaser.Scene {
        player!: Phaser.Physics.Arcade.Sprite;
        obstacles!: Phaser.Physics.Arcade.Group;
        ground!: Phaser.Physics.Arcade.StaticGroup;
        cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
        spaceKey!: Phaser.Input.Keyboard.Key;
        gameSpeed = 200;
        gameScore = 0;
        isGameOver = false;
        scoreText!: Phaser.GameObjects.Text;

        constructor() {
          super({ key: 'GameScene' });
        }

        preload() {
          console.log('Preloading assets...');
          
          // Add loading progress
          const progressBar = this.add.graphics();
          const progressBox = this.add.graphics();
          progressBox.fillStyle(0x222222, 0.8);
          progressBox.fillRect(250, 280, 300, 50);

          const loadingText = this.add.text(400, 240, 'Loading...', {
            fontSize: '20px',
            color: '#ffffff'
          }).setOrigin(0.5, 0.5);

          this.load.on('progress', (value: number) => {
            console.log('Loading progress:', value);
            progressBar.clear();
            progressBar.fillStyle(0x00ffff, 1);
            progressBar.fillRect(260, 290, 280 * value, 30);
          });

          this.load.on('complete', () => {
            console.log('Asset loading complete!');
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
          });

          // Load assets with error handling
          this.load.image('character', '/assets/nocrying-escape/character.svg');
          this.load.image('background', '/assets/nocrying-escape/background.svg');
          this.load.image('obstacle-rug', '/assets/nocrying-escape/obstacle-rug.svg');
          this.load.image('obstacle-tear', '/assets/nocrying-escape/obstacle-tear.svg');
          this.load.image('obstacle-coin', '/assets/nocrying-escape/obstacle-coin.svg');

          // Add error handling for asset loading
          this.load.on('loaderror', (file: any) => {
            console.error('Failed to load asset:', file.key);
          });
        }

        create() {
          console.log('Creating game scene...');
          
          // Set up background
          const bg = this.add.image(0, 0, 'background');
          bg.setOrigin(0, 0);
          bg.setScale(800 / 1280, 400 / 720);

          // Create ground (invisible collision)
          this.ground = this.physics.add.staticGroup();
          const groundY = 360;
          for (let x = 0; x < 900; x += 100) {
            const groundPiece = this.ground.create(x, groundY, '');
            groundPiece.setSize(100, 40);
            groundPiece.setVisible(false);
          }

          // Create player
          this.player = this.physics.add.sprite(100, groundY - 60, 'character');
          this.player.setCollideWorldBounds(true);
          this.player.setSize(32, 48);
          this.player.setScale(0.8);
          this.physics.add.collider(this.player, this.ground);

          // Create obstacles group
          this.obstacles = this.physics.add.group();

          // Score display
          this.scoreText = this.add.text(20, 20, 'Score: 0s', {
            fontSize: '24px',
            color: '#00FFFF',
            fontStyle: 'bold'
          });

          // Instructions
          this.add.text(400, 50, 'PRESS SPACE OR CLICK TO JUMP', {
            fontSize: '16px',
            color: '#FF6B35',
            fontStyle: 'bold'
          }).setOrigin(0.5);

          // Input handling
          this.cursors = this.input.keyboard!.createCursorKeys();
          this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
          
          // Touch/click input
          this.input.on('pointerdown', () => {
            this.jump();
          });

          // Start game loop
          this.startGameLoop();

          console.log('Game scene created successfully!');
        }

        update() {
          if (this.isGameOver) return;

          // Jump input
          if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || 
              Phaser.Input.Keyboard.JustDown(this.cursors.up!)) {
            this.jump();
          }
        }

        jump() {
          if (!this.isGameOver && this.player.body && this.player.body.touching.down) {
            this.player.setVelocityY(-400);
          }
        }

        startGameLoop() {
          // Score timer
          this.time.addEvent({
            delay: 100,
            callback: () => {
              if (!this.isGameOver) {
                this.gameScore += 0.1;
                this.scoreText.setText(`Score: ${Math.floor(this.gameScore)}s`);
                setScore(Math.floor(this.gameScore));
                
                // Increase difficulty every 10 seconds
                if (Math.floor(this.gameScore) % 10 === 0 && this.gameScore % 1 < 0.1) {
                  this.gameSpeed += 20;
                }
              }
            },
            loop: true
          });

          // Obstacle spawner
          this.time.addEvent({
            delay: 2000,
            callback: this.spawnObstacle,
            callbackScope: this,
            loop: true
          });
        }

        spawnObstacle() {
          if (this.isGameOver) return;

          const obstacleTypes = ['rug', 'tear', 'coin'];
          const randomType = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
          
          const x = 850;
          const y = 320;
          
          const obstacle = this.physics.add.sprite(x, y, `obstacle-${randomType}`);
          obstacle.setVelocityX(-this.gameSpeed);
          obstacle.setSize(40, 40);
          obstacle.setScale(0.6);
          
          this.obstacles.add(obstacle);

          // Collision with player
          this.physics.add.overlap(this.player, obstacle, () => {
            if (!this.isGameOver) {
              this.isGameOver = true;
              this.player.setVelocity(0, 0);
              this.player.setTint(0xff0000);
              
              this.add.text(400, 200, 'GAME OVER', {
                fontSize: '48px',
                color: '#FF0000',
                fontStyle: 'bold'
              }).setOrigin(0.5);

              this.time.delayedCall(2000, () => {
                endGame(Math.floor(this.gameScore));
              });
            }
          });

          // Clean up off-screen obstacles
          this.time.delayedCall(5000, () => {
            if (obstacle && obstacle.active) {
              obstacle.destroy();
            }
          });
        }
      }

      // Game configuration
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 800,
        height: 400,
        backgroundColor: '#0f0f23',
        parent: gameContainerRef.current,
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { y: 800, x: 0 },
            debug: false
          }
        },
        scene: GameScene,
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH
        },
        // Add callbacks for debugging
        callbacks: {
          preBoot: () => {
            console.log('Phaser preBoot callback');
          },
          postBoot: () => {
            console.log('Phaser postBoot callback - game fully initialized');
          }
        }
      };

      console.log('Creating Phaser game...');
      const game = new Phaser.Game(config);
      
      // Store game reference for cleanup
      (gameContainerRef.current as any).phaserGame = game;
      
      console.log('Phaser game created successfully!');
      
    } catch (error: any) {
      console.error('Error initializing Phaser game:', error);
      // Fallback to simple message
      if (gameContainerRef.current) {
        gameContainerRef.current.innerHTML = `
          <div class="text-center text-red-400 p-8">
            <p>Game failed to load: ${error?.message || 'Unknown error'}</p>
            <p class="text-sm mt-2">Check console for details</p>
          </div>
        `;
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Minimal Header */}
      <header className="border-b border-neon-cyan/30 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center space-x-4 cursor-pointer hover:opacity-80 transition-opacity duration-200">
              <div className="w-12 h-12 bg-gradient-to-br from-neon-cyan to-neon-orange rounded-lg flex items-center justify-center border-2 border-neon-cyan shadow-neon-cyan">
                <img src={logoPath} alt="Scratch 'n SOL" className="w-8 h-8 object-contain" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-black text-neon-cyan">SCRATCH 'n SOL</h1>
              </div>
            </div>
          </Link>

          <div className="flex items-center space-x-4">
            <Link href="/games">
              <Button 
                variant="outline"
                size="sm"
                className="border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/10"
                data-testid="button-back-games"
              >
                ← Games
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Demo Banner */}
      <DemoBanner />

      {/* Game Container */}
      <div className="flex-1 flex flex-col">
        <div className="max-w-4xl mx-auto px-4 py-8 flex-1 flex flex-col">
          
          {/* Game Menu */}
          {gameState === 'menu' && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md mx-auto">
                {/* Game Character */}
                <div className="mb-8">
                  <img 
                    src="/assets/nocrying-escape/character.svg" 
                    alt="NoCrying Character" 
                    className="w-32 h-32 mx-auto mb-6 animate-bounce"
                  />
                  <h1 className="text-4xl font-black text-neon-cyan mb-4">
                    NoCrying Escape
                  </h1>
                  <p className="text-gray-300 mb-6">
                    Dodge RUG pulls, tears, and broken coins in this infinite runner!
                  </p>
                </div>

                {/* Instructions */}
                <div className="bg-gradient-to-br from-dark-purple/40 to-deep-space/60 border border-neon-cyan/30 rounded-xl p-6 mb-8">
                  <h3 className="text-neon-orange font-bold text-lg mb-4">How to Play:</h3>
                  <div className="text-gray-300 space-y-2">
                    <p>• Tap SPACE or click to jump</p>
                    <p>• Avoid obstacles to survive longer</p>
                    <p>• Speed increases every 10 seconds</p>
                    <p>• Beat your best score!</p>
                  </div>
                </div>

                {/* Scores */}
                {bestScore > 0 && (
                  <div className="mb-6">
                    <p className="text-neon-cyan">Best Score: <span className="font-bold">{bestScore}s</span></p>
                  </div>
                )}

                {/* Play Button */}
                <Button 
                  onClick={startGame}
                  className="bg-gradient-to-r from-neon-cyan to-electric-blue text-black font-bold px-8 py-4 text-xl rounded-xl hover:shadow-lg hover:shadow-neon-cyan/30 transition-all duration-300"
                  data-testid="button-start-game"
                >
                  Play Demo
                </Button>
              </div>
            </div>
          )}

          {/* Game Playing */}
          {gameState === 'playing' && (
            <div className="flex-1 flex flex-col">
              <div className="text-center mb-4">
                <p className="text-neon-cyan font-bold text-xl">Score: {score}s</p>
                <p className="text-gray-400 text-sm">Press SPACE to jump!</p>
              </div>
              
              {/* Game Canvas Container */}
              <div 
                ref={gameContainerRef}
                className="flex-1 bg-gradient-to-br from-purple-900/50 to-teal-900/50 border border-neon-cyan/30 rounded-xl min-h-[400px] overflow-hidden"
              >
                {/* Fallback content will be replaced by Phaser */}
              </div>
            </div>
          )}

          {/* Game Over */}
          {gameState === 'gameover' && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md mx-auto">
                <h2 className="text-3xl font-black text-neon-orange mb-4">Game Over!</h2>
                
                <div className="bg-gradient-to-br from-dark-purple/40 to-deep-space/60 border border-neon-cyan/30 rounded-xl p-6 mb-8">
                  <p className="text-2xl font-bold text-neon-cyan mb-2">
                    You survived {score} seconds
                  </p>
                  {score === bestScore && score > 0 && (
                    <p className="text-neon-orange font-bold">🎉 New Best Score!</p>
                  )}
                  {bestScore > 0 && score !== bestScore && (
                    <p className="text-gray-400">Best: {bestScore}s</p>
                  )}
                </div>

                <div className="flex justify-center space-x-4">
                  <Button 
                    onClick={startGame}
                    className="bg-gradient-to-r from-neon-cyan to-electric-blue text-black font-bold px-6 py-3 rounded-lg hover:shadow-lg hover:shadow-neon-cyan/30 transition-all duration-300"
                    data-testid="button-retry-game"
                  >
                    Retry
                  </Button>
                  <Link href="/games">
                    <Button 
                      variant="outline"
                      className="border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/10 font-bold px-6 py-3"
                      data-testid="button-back-to-games"
                    >
                      Back to Games
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}