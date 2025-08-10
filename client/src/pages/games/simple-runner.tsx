import { useRef, useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

export default function SimpleRunner() {
  const gameRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [score, setScore] = useState(0);
  const gameInstanceRef = useRef<any>(null);

  const startGame = async () => {
    if (!gameRef.current) return;

    setGameState('playing');
    setScore(0);

    try {
      // Clear previous game
      gameRef.current.innerHTML = '';
      
      // Import Phaser
      const Phaser = (await import('phaser')).default;
      
      // Simple working game scene
      class SimpleGameScene extends Phaser.Scene {
        player?: Phaser.Physics.Arcade.Sprite;
        cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
        spaceKey?: Phaser.Input.Keyboard.Key;
        gameScore = 0;
        scoreText?: Phaser.GameObjects.Text;
        obstacles?: Phaser.Physics.Arcade.Group;
        gameSpeed = 200;
        isGameOver = false;

        constructor() {
          super({ key: 'SimpleGameScene' });
        }

        preload() {
          // Create simple colored rectangles instead of SVG assets
          this.load.image('player', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA60e6kgAAAABJRU5ErkJggg==');
          
          // Create colored rectangles for obstacles
          const canvas = document.createElement('canvas');
          canvas.width = 32;
          canvas.height = 32;
          const ctx = canvas.getContext('2d')!;
          
          // Player (cyan rectangle)
          ctx.fillStyle = '#00ffff';
          ctx.fillRect(0, 0, 32, 48);
          this.textures.addCanvas('player', canvas);
          
          // Obstacle (red rectangle)  
          ctx.fillStyle = '#ff0000';
          ctx.fillRect(0, 0, 32, 32);
          this.textures.addCanvas('obstacle', canvas);
        }

        create() {
          // Create background
          this.add.rectangle(400, 200, 800, 400, 0x1a1a2e);
          
          // Create ground
          const ground = this.physics.add.staticGroup();
          ground.create(400, 380, '').setSize(800, 40).setVisible(false);
          
          // Create player
          this.player = this.physics.add.sprite(100, 300, 'player');
          this.player.setCollideWorldBounds(true);
          this.physics.add.collider(this.player, ground);
          
          // Create obstacles group
          this.obstacles = this.physics.add.group();
          
          // Score text
          this.scoreText = this.add.text(20, 20, 'Score: 0', {
            fontSize: '24px',
            color: '#00ffff'
          });
          
          // Instructions
          this.add.text(400, 50, 'PRESS SPACE TO JUMP', {
            fontSize: '20px',
            color: '#ffffff'
          }).setOrigin(0.5);
          
          // Input
          this.cursors = this.input.keyboard!.createCursorKeys();
          this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
          
          // Touch input
          this.input.on('pointerdown', () => {
            this.jump();
          });
          
          // Start game loops
          this.startObstacleSpawner();
          this.startScoreTimer();
        }

        update() {
          if (this.isGameOver) return;
          
          if (Phaser.Input.Keyboard.JustDown(this.spaceKey!) || 
              Phaser.Input.Keyboard.JustDown(this.cursors!.up!)) {
            this.jump();
          }
        }

        jump() {
          if (this.player && this.player.body && this.player.body.touching.down) {
            this.player.setVelocityY(-500);
          }
        }

        startObstacleSpawner() {
          this.time.addEvent({
            delay: 2000,
            callback: this.spawnObstacle,
            callbackScope: this,
            loop: true
          });
        }

        spawnObstacle() {
          if (this.isGameOver) return;
          
          const obstacle = this.physics.add.sprite(850, 348, 'obstacle');
          obstacle.setVelocityX(-this.gameSpeed);
          this.obstacles!.add(obstacle);
          
          // Collision
          this.physics.add.overlap(this.player!, obstacle, () => {
            this.gameOver();
          });
          
          // Clean up
          this.time.delayedCall(5000, () => {
            if (obstacle.active) obstacle.destroy();
          });
        }

        startScoreTimer() {
          this.time.addEvent({
            delay: 100,
            callback: () => {
              if (!this.isGameOver) {
                this.gameScore += 0.1;
                this.scoreText!.setText(`Score: ${Math.floor(this.gameScore)}`);
                setScore(Math.floor(this.gameScore));
                
                // Increase difficulty
                if (Math.floor(this.gameScore) % 10 === 0) {
                  this.gameSpeed += 10;
                }
              }
            },
            loop: true
          });
        }

        gameOver() {
          this.isGameOver = true;
          this.player!.setVelocity(0);
          this.player!.setTint(0xff0000);
          
          this.add.text(400, 200, 'GAME OVER', {
            fontSize: '48px',
            color: '#ff0000'
          }).setOrigin(0.5);
          
          this.time.delayedCall(2000, () => {
            setGameState('gameover');
          });
        }
      }

      // Game config
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 800,
        height: 400,
        backgroundColor: '#1a1a2e',
        parent: gameRef.current,
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { y: 800, x: 0 },
            debug: false
          }
        },
        scene: SimpleGameScene
      };

      // Create game
      gameInstanceRef.current = new Phaser.Game(config);
      
    } catch (error: any) {
      console.error('Game error:', error);
      setGameState('menu');
      if (gameRef.current) {
        gameRef.current.innerHTML = `
          <div class="text-center text-red-400 p-8">
            <p>Failed to start game: ${error.message}</p>
          </div>
        `;
      }
    }
  };

  const resetGame = () => {
    if (gameInstanceRef.current) {
      gameInstanceRef.current.destroy(true);
      gameInstanceRef.current = null;
    }
    setGameState('menu');
    setScore(0);
    if (gameRef.current) {
      gameRef.current.innerHTML = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-teal-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/games" className="text-cyan-400 hover:text-cyan-300">
            ← Back to Games
          </Link>
        </div>

        <h1 className="text-4xl font-bold text-cyan-400 mb-8 text-center">Simple Runner</h1>

        <div className="max-w-4xl mx-auto">
          {gameState === 'menu' && (
            <div className="text-center mb-8">
              <Button 
                onClick={startGame}
                className="bg-cyan-600 hover:bg-cyan-700 px-8 py-4 text-xl"
              >
                Start Game
              </Button>
            </div>
          )}

          {gameState === 'playing' && (
            <div className="text-center mb-4">
              <p className="text-2xl text-cyan-400">Score: {score}</p>
              <p className="text-gray-400">Press SPACE or click to jump</p>
            </div>
          )}

          {gameState === 'gameover' && (
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-red-400 mb-4">Game Over!</h2>
              <p className="text-xl text-cyan-400 mb-6">Final Score: {score}</p>
              <Button 
                onClick={resetGame}
                className="bg-cyan-600 hover:bg-cyan-700 px-8 py-4"
              >
                Play Again
              </Button>
            </div>
          )}

          <div 
            ref={gameRef}
            className="mx-auto border-2 border-cyan-400 rounded-lg overflow-hidden"
            style={{ width: '800px', height: '400px' }}
          >
            {gameState === 'menu' && (
              <div className="flex items-center justify-center h-full bg-gray-800">
                <p className="text-gray-400">Click Start Game to begin</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}