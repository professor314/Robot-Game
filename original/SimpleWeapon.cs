using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace CSharpRPG
{
    class SimpleWeapon : Item
    {
        private int _dmg;

        public SimpleWeapon(string name, int tile, int damage) : base(name, tile)
        {
            _dmg = damage;
        }

        public override int Attack(Character c)
        {
            int damageDealt;
            if (_dmg <= c.HP)
            {
                c.HP -= _dmg;
                damageDealt = _dmg;
            }
            else
            {
                damageDealt = c.HP;
                c.HP = 0;
            }
            return damageDealt;
        }
    }
}
