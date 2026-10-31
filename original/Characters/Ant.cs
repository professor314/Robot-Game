using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace CSharpRPG.Characters
{
    class Ant : Character
    {

        public override string charName
        {
            get { return "Ant"; }
        }


        public override int unarmedDamage
        {
            //one damage point per level;
            get { return Level; }
        }

        public override int TileID
        {
            get { return 0; }
        }

        public override int Capacity
        {
            get { return 0; }
        }

        public override int Level
        {
            get { return 1; }
        }
        
        public override int MaxHP
        {
            get { return 3; }
        }
    }
}
