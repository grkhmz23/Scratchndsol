import { ticketTypes } from '@shared/schema';
import { Card, CardContent } from '@/components/ui/card';
import { formatSOL } from '@/lib/game-logic';

interface TicketSelectionProps {
  onTicketSelect: (ticketCost: number) => void;
}

export function TicketSelection({ onTicketSelect }: TicketSelectionProps) {
  return (
    <section className="mb-12">
      <h2 className="text-3xl font-black text-center mb-8 text-neon-cyan animate-pulse-neon">
        CHOOSE YOUR CARD
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {ticketTypes.map((ticket, index) => (
          <div key={ticket.cost} className="group relative">
            <Card 
              className={`
                bg-gradient-to-br from-dark-purple to-deep-space cursor-pointer transition-all duration-300 
                hover:transform hover:scale-105 
                ${index < 3 ? 'border-2 border-neon-cyan hover:border-neon-orange hover:shadow-neon-orange' : 
                  index === 3 ? 'border-2 border-neon-orange hover:border-neon-gold hover:shadow-neon-gold' :
                  'border-2 border-neon-gold hover:border-success-green hover:shadow-neon-gold'}
              `}
              onClick={() => onTicketSelect(ticket.cost)}
            >
              <CardContent className="p-6 text-center">
                <div className={`
                  text-2xl font-black mb-2 transition-colors duration-300
                  ${index < 3 ? 'text-neon-cyan group-hover:text-neon-orange' :
                    index === 3 ? 'text-neon-orange group-hover:text-neon-gold' :
                    'text-neon-gold group-hover:text-success-green'}
                `}>
                  {formatSOL(ticket.cost)}
                </div>
                <div className="text-sm text-gray-300 mb-4">Entry Cost</div>
                <div className={`
                  border-t pt-4
                  ${index < 3 ? 'border-neon-cyan/30' :
                    index === 3 ? 'border-neon-orange/30' :
                    'border-neon-gold/30'}
                `}>
                  <div className="text-lg font-bold text-neon-gold">MAX WIN</div>
                  <div className="text-xl font-black text-success-green">
                    {formatSOL(ticket.maxWin)}
                  </div>
                </div>
                <div className={`
                  absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300
                  ${index < 3 ? 'bg-neon-cyan/5' :
                    index === 3 ? 'bg-neon-orange/5' :
                    'bg-neon-gold/5'}
                `}></div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </section>
  );
}
