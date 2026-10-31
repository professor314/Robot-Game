using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace CSharpRPG.Characters
{
    class Player : Character
    {

        private const int PLAYER = 335;//He looks like Indiana Jones  

        public override string charName
        {
            get { return "The Player"; }
        }


        public override int unarmedDamage
        {
            //3 damage points per level, rounded;
            get { return Level * 3; }
        }

        public override int TileID
        {
            get { return PLAYER; }
        }

        public override int Capacity
        {
            get { return 5; }
        }

        public override int Level
        {
            get { return 1; }
        }
        
        public override int MaxHP
        {
            get { return 10; }
        }
    }
}
