import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Sparkles,
  Shield,
  Wallet,
  Gamepad2,
  Coins,
  Users,
  Landmark,
  CheckCircle2,
  Globe,
  Lock,
  TrendingUp,
  MousePointerClick,
  Timer,
  HelpCircle,
} from 'lucide-react';
import logoPath from '@assets/revealx-logo.png';

const StepCard = ({
  number,
  title,
  description,
  icon: Icon,
}: {
  number: string;
  title: string;
  description: string;
  icon: any;
}) => (
  <div className="relative pl-12">
    <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center text-white font-bold text-sm">
      {number}
    </div>
    <div className="flex items-center gap-2 mb-1">
      <Icon className="w-4 h-4 text-neon-cyan" />
      <h3 className="text-lg font-bold text-white">{title}</h3>
    </div>
    <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
  </div>
);

const FeatureRow = ({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) => (
  <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-900/40 border border-neon-cyan/10 hover:border-neon-cyan/30 transition-colors">
    <div className="w-10 h-10 rounded-lg bg-neon-cyan/10 flex items-center justify-center shrink-0">
      <Icon className="w-5 h-5 text-neon-cyan" />
    </div>
    <div>
      <h4 className="text-white font-semibold mb-1">{title}</h4>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  </div>
);

export default function HowItWorks() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-neon-cyan/30 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-gradient-to-br from-neon-cyan to-neon-orange rounded-lg flex items-center justify-center border border-neon-cyan">
                <img src={logoPath} alt="RevealX" className="w-8 h-8 object-contain" />
              </div>
              <span className="text-xl font-black text-neon-cyan hidden sm:block">REVEALX</span>
            </div>
          </Link>
          <Button
            variant="outline"
            onClick={() => setLocation('/')}
            className="border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Game
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="text-center mb-12">
          <Badge className="bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30 mb-4">
            <HelpCircle className="w-3 h-3 mr-1" />
            User Guide
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4">
            How <span className="text-neon-cyan">RevealX</span> Works
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            The first on-chain scratch card platform with verifiable randomness, shared liquidity,
            and creator-launched campaigns on Solana and Base.
          </p>
        </div>

        {/* Quick Nav */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {[
            { label: 'Getting Started', href: '#getting-started' },
            { label: 'Game Flow', href: '#game-flow' },
            { label: 'v2 Features', href: '#v2-features' },
            { label: 'Payouts', href: '#payouts' },
            { label: 'Security', href: '#security' },
            { label: 'FAQ', href: '#faq' },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="px-4 py-2 rounded-lg bg-gray-900/50 border border-neon-cyan/20 text-sm text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* Getting Started */}
        <section id="getting-started" className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-neon-cyan/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-neon-cyan" />
            </div>
            <h2 className="text-2xl font-black text-white">Getting Started</h2>
          </div>

          <div className="space-y-8">
            <StepCard
              number="1"
              title="Choose Your Chain"
              description="Switch between Solana and Base using the chain selector in the header. Each chain has its own scratch card tiers and currency — SOL on Solana, USDC on Base."
              icon={Globe}
            />
            <StepCard
              number="2"
              title="Pick Demo or Real Mode"
              description="Demo mode lets you play instantly without a wallet — perfect for learning the game. Real mode requires a connected wallet and real funds, with automatic on-chain payouts when you win."
              icon={Gamepad2}
            />
            <StepCard
              number="3"
              title="Select a Card Tier"
              description="Choose from Bronze to Diamond. Higher tiers cost more but offer bigger max wins. On Base v2, each creator campaign has a fixed tier — the cost and potential reward are shown upfront."
              icon={MousePointerClick}
            />
            <StepCard
              number="4"
              title="Scratch & Reveal"
              description="Use your mouse or finger to scratch the card on the HTML5 canvas. Reveal 60% of the surface to see your result. You can also click 'Scratch All' to reveal instantly."
              icon={Sparkles}
            />
            <StepCard
              number="5"
              title="Collect Winnings"
              description="If you win, your payout is sent directly to your wallet — automatically on Solana, or via the on-chain pool settlement on Base v2. No manual claims needed."
              icon={Wallet}
            />
          </div>
        </section>

        <Separator className="bg-neon-cyan/10 mb-16" />

        {/* Game Flow */}
        <section id="game-flow" className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-neon-purple/10 flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-neon-purple" />
            </div>
            <h2 className="text-2xl font-black text-white">The Game Flow</h2>
          </div>

          <Card className="bg-gray-900/50 border-neon-cyan/20 mb-6">
            <CardHeader>
              <CardTitle className="text-white">Demo Mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-400">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                <span>No wallet required — play immediately</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                <span>Same casino engine and odds as real mode</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                <span>Completely isolated — no real money at risk</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                <span>Stats saved per wallet address in localStorage</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-neon-cyan/20">
            <CardHeader>
              <CardTitle className="text-white">Real Mode — Solana (v1)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-400">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-neon-cyan mt-0.5 shrink-0" />
                <span>Connect Phantom, Solflare, or Backpack wallet</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-neon-cyan mt-0.5 shrink-0" />
                <span>Buy ticket — SOL is transferred to the game pool</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-neon-cyan mt-0.5 shrink-0" />
                <span>Server verifies the on-chain transfer</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-neon-cyan mt-0.5 shrink-0" />
                <span>Casino engine determines outcome with cryptographically secure RNG</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-neon-cyan mt-0.5 shrink-0" />
                <span>You scratch the card — the result was already decided server-side</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-neon-cyan mt-0.5 shrink-0" />
                <span>Win? Payout is sent automatically from the pool wallet to yours</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-neon-cyan/20 mt-4">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Badge className="bg-neon-purple/20 text-neon-purple border-neon-purple/30">NEW</Badge>
                Real Mode — Base (v2)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-400">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-neon-purple mt-0.5 shrink-0" />
                <span>Connect MetaMask, Coinbase Wallet, or WalletConnect</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-neon-purple mt-0.5 shrink-0" />
                <span>Choose a creator campaign — each has custom branding and a fixed tier</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-neon-purple mt-0.5 shrink-0" />
                <span>Approve USDC spend, then call playCard() on the GameManager contract</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-neon-purple mt-0.5 shrink-0" />
                <span>Chainlink VRF v2.5 generates provably random numbers on-chain</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-neon-purple mt-0.5 shrink-0" />
                <span>GameManager settles the win directly through the RevealXPool contract</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-neon-purple mt-0.5 shrink-0" />
                <span>Creator earns a revenue share from every play on their campaign</span>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator className="bg-neon-cyan/10 mb-16" />

        {/* v2 Features */}
        <section id="v2-features" className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-neon-orange/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-neon-orange" />
            </div>
            <h2 className="text-2xl font-black text-white">RevealX v2 Features</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FeatureRow
              icon={Landmark}
              title="Shared Liquidity Pool"
              description="The RevealXPool is an ERC-4626 vault on Base. Deposit USDC to mint rvlxUSDC shares. The pool collects wagers, pays winners, and distributes protocol fees to LPs."
            />
            <FeatureRow
              icon={Users}
              title="Creator Campaigns"
              description="Anyone can launch a branded scratch card campaign. Set your tier, max plays, expiry, and revenue share. Players discover your campaign via shareable links and embed codes."
            />
            <FeatureRow
              icon={Shield}
              title="Verifiable Randomness"
              description="Base v2 uses Chainlink VRF v2.5 — every game outcome is backed by a cryptographic proof generated off-chain and verified on-chain. No one can manipulate results."
            />
            <FeatureRow
              icon={Coins}
              title="Creator Revenue Share"
              description="Creators earn a configurable share of the protocol fee from every play on their campaign. Fees are distributed automatically during pool settlement."
            />
          </div>

          <Card className="bg-gray-900/50 border-neon-cyan/20 mt-6">
            <CardHeader>
              <CardTitle className="text-white">Ticket Tiers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neon-cyan/20">
                      <th className="text-left text-gray-400 font-medium py-2 pr-4">Tier</th>
                      <th className="text-left text-gray-400 font-medium py-2 pr-4">Solana (SOL)</th>
                      <th className="text-left text-gray-400 font-medium py-2 pr-4">Base (USDC)</th>
                      <th className="text-left text-gray-400 font-medium py-2">Max Win</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-300">
                    <tr className="border-b border-gray-800">
                      <td className="py-2 pr-4 font-semibold text-amber-500">Bronze</td>
                      <td className="py-2 pr-4">0.1 SOL</td>
                      <td className="py-2 pr-4">$1 USDC</td>
                      <td className="py-2">10×</td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="py-2 pr-4 font-semibold text-slate-400">Silver</td>
                      <td className="py-2 pr-4">0.2 SOL</td>
                      <td className="py-2 pr-4">$2 USDC</td>
                      <td className="py-2">20×</td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="py-2 pr-4 font-semibold text-yellow-400">Gold</td>
                      <td className="py-2 pr-4">0.5 SOL</td>
                      <td className="py-2 pr-4">$5 USDC</td>
                      <td className="py-2">50×</td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="py-2 pr-4 font-semibold text-cyan-300">Platinum</td>
                      <td className="py-2 pr-4">0.75 SOL</td>
                      <td className="py-2 pr-4">$10 USDC</td>
                      <td className="py-2">100×</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-semibold text-purple-400">Diamond</td>
                      <td className="py-2 pr-4">1.0 SOL</td>
                      <td className="py-2 pr-4">$25 USDC</td>
                      <td className="py-2">250×</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator className="bg-neon-cyan/10 mb-16" />

        {/* Payouts */}
        <section id="payouts" className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-green-400" />
            </div>
            <h2 className="text-2xl font-black text-white">Payouts & Economics</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="bg-gray-900/50 border-neon-cyan/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-400">House Edge</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">~10%</div>
                <p className="text-xs text-gray-500 mt-1">Ensures long-term platform sustainability</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-neon-cyan/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-400">Protocol Fee</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">30%</div>
                <p className="text-xs text-gray-500 mt-1">Of net house edge, split between LPs, creator, and treasury</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-neon-cyan/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-400">Max Single Payout</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">25%</div>
                <p className="text-xs text-gray-500 mt-1">Of pool TVL. Owner-adjustable between 5% and 30%.</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-neon-cyan/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-400">Base Win Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">~25%</div>
                <p className="text-xs text-gray-500 mt-1">Adjusted by tier and pool health. Lower for Diamond, higher for Bronze.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator className="bg-neon-cyan/10 mb-16" />

        {/* Security */}
        <section id="security" className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-red-400" />
            </div>
            <h2 className="text-2xl font-black text-white">Security & Fairness</h2>
          </div>

          <div className="space-y-4">
            {[
              {
                title: 'Chainlink VRF v2.5',
                desc: 'Every Base v2 game uses Chainlink VRF for provably fair randomness. The cryptographic proof is verified on-chain before any payout.',
              },
              {
                title: 'Server-Side RNG (Solana)',
                desc: 'The Solana off-chain engine uses Node.js crypto.randomBytes() for cryptographically secure randomness, with dynamic win rates adjusted by pool health.',
              },
              {
                title: 'Pool Health Checks',
                desc: 'The casino engine adjusts win rates downward when the pool balance is low. Games are blocked if the pool cannot cover the max potential payout.',
              },
              {
                title: 'Rate Limiting',
                desc: 'Tiered rate limits prevent abuse: 5 payouts/min, 10 games/min, 60 general API calls/min. Per-wallet hourly (100) and daily (500) quotas.',
              },
              {
                title: 'Idempotency Keys',
                desc: 'Duplicate payout requests with the same key return the cached result — preventing double-spends.',
              },
              {
                title: 'Payout Caps',
                desc: 'Max single win: 10 SOL / 250 USDC. Max hourly: 50 SOL / 500 USDC. Max daily: 200 SOL / 2000 USDC.',
              },
              {
                title: 'Input Validation',
                desc: 'All inputs are validated via Zod schemas. Wallet addresses are checked against Base58 (Solana) and EVM (0x...) regex.',
              },
              {
                title: 'Geoblocking',
                desc: 'Access is restricted from high-risk jurisdictions via Cloudflare country headers.',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 rounded-lg bg-gray-900/30 border border-gray-800 hover:border-neon-cyan/20 transition-colors"
              >
                <Shield className="w-5 h-5 text-neon-cyan shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-white font-semibold text-sm">{item.title}</h4>
                  <p className="text-gray-400 text-sm mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Separator className="bg-neon-cyan/10 mb-16" />

        {/* FAQ */}
        <section id="faq" className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-neon-cyan/10 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-neon-cyan" />
            </div>
            <h2 className="text-2xl font-black text-white">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'Do I need a wallet to play?',
                a: 'No — Demo mode works without any wallet. For real mode, you need a Solana wallet (Phantom, Solflare, Backpack) or an EVM wallet (MetaMask, Coinbase Wallet) for Base.',
              },
              {
                q: 'How do I know the game is fair?',
                a: 'On Base v2, every outcome is generated by Chainlink VRF — a cryptographically verifiable random function. The proof is published on-chain. On Solana, the server uses Node.js crypto.randomBytes() with transparent odds.',
              },
              {
                q: 'When do I get paid if I win?',
                a: 'Instantly. Solana payouts are sent within seconds of scratching. Base v2 payouts are settled directly by the smart contract during the VRF fulfillment.',
              },
              {
                q: 'What happens if I disconnect mid-game?',
                a: 'The game outcome is determined at purchase time, not at scratch time. If you bought a ticket and won, the payout will still be processed when you return.',
              },
              {
                q: 'Can I create my own scratch card campaign?',
                a: 'Yes! Go to /creator, connect your Base wallet, and launch a campaign. Set your branding, tier, max plays, expiry, and revenue share. Share the link or embed it on your site.',
              },
              {
                q: 'How do I earn yield from the pool?',
                a: 'Deposit USDC into the RevealXPool at /pool. You receive rvlxUSDC shares. As players play and lose, the pool grows and protocol fees are distributed. Withdraw anytime by redeeming your shares.',
              },
              {
                q: 'What chains are supported?',
                a: 'Solana (mainnet & devnet) and Base (mainnet & Sepolia). Switch chains in the header selector.',
              },
              {
                q: 'Is there a minimum deposit for the LP pool?',
                a: 'No minimum. Deposit any amount of USDC. Note that your shares represent a proportional claim on the pool assets, which fluctuate with game outcomes.',
              },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-lg bg-gray-900/40 border border-gray-800">
                <h4 className="text-white font-semibold mb-1">{item.q}</h4>
                <p className="text-gray-400 text-sm">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <Separator className="bg-neon-cyan/10 mb-12" />

        {/* Responsible Gambling */}
        <section className="mb-12">
          <Card className="bg-red-500/5 border-red-500/20">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center gap-2">
                <Timer className="w-5 h-5" />
                Play Responsibly
              </CardTitle>
            </CardHeader>
            <CardContent className="text-gray-400 text-sm space-y-2">
              <p>RevealX is gambling software. Before playing, ensure you:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Are 18 years of age or older</li>
                <li>Understand that you can lose your wager</li>
                <li>Only gamble with funds you can afford to lose</li>
                <li>Comply with all applicable laws in your jurisdiction</li>
              </ul>
              <p className="text-xs text-gray-500 mt-2">
                If you or someone you know has a gambling problem, please seek help.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* CTA */}
        <div className="text-center">
          <Button
            onClick={() => setLocation('/')}
            size="lg"
            className="bg-gradient-to-r from-neon-cyan to-neon-purple hover:opacity-90 text-white font-bold px-8 py-3"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Start Playing
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neon-cyan/30 mt-20 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="text-gray-400 text-sm mb-4">
            Powered by Solana & Base Blockchain • Built with ❤️ for the crypto community
          </div>
          <div className="text-xs text-gray-500">
            Play responsibly • Must be 18+ • Gambling can be addictive
          </div>
        </div>
      </footer>
    </div>
  );
}
